import appcdLogger from 'appcd-logger';
import Dispatcher from 'appcd-dispatcher';
import fs from 'fs-extra';
import ListInstalled from './sdk-list-installed';
import path from 'path';
import request from 'appcd-request';
import Response, { AppcdError, codes } from 'appcd-response';
import tmp from 'tmp';
import yauzl from 'yauzl';

import { arch, get, unique } from 'appcd-util';
import { expandPath } from 'appcd-path';
import { isDir, isFile } from 'appcd-fs';
import { rcompare } from './version';
import { sdk } from 'titaniumlib';
import { STATUS_CODES } from 'http';

const { highlight } = appcdLogger.styles;

/**
 * The current machine's architecture.
 * @type {String}
 */
const architecture = arch();

/**
 * A regex to extract a continuous integration build version and platform from the filename.
 * @type {RegExp}
 */
const ciBuildRegExp = /^mobilesdk-(.+)(?:\.v|-)((\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2}))-([^.]+)/;

/**
 * The current machine's operating system.
 * @type {String}
 */
const os = process.platform === 'darwin' ? 'osx' : process.platform;

/**
 * A regex to test if a string is a URL or path to a zip file.
 * @type {RegExp}
 */
const uriRegExp = /^(https?:\/\/.+)|(?:file:\/\/\/(.+))$/;

/**
 * Defines a service endpoint for listing, installing, and uninstalling Titanium SDKs.
 */
export default class SDKService extends Dispatcher {
	/**
	 * Registers all of the endpoints and initializes the installed SDKs detect engine.
	 *
	 * @param {Object} cfg - The Appc Daemon config object.
	 * @returns {Promise}
	 * @access public
	 */
	async activate(cfg) {
		this.config = cfg;

		this.installed = new ListInstalled();
		await this.installed.activate(cfg);

		this.register([ '/', '/list' ], (ctx, next) => {
			ctx.path = '/list/installed';
			return next();
		})
			.register('/list/installed', this.installed)
			.register('/list/ci-branches', () => fetch('http://builds.appcelerator.com/mobile/branches.json'))
			.register('/list/ci-builds/:branch?', ctx => this.getBuilds(ctx.request.params.branch))
			.register('/list/locations', ctx => this.getInstallPaths())
			.register('/list/releases', ctx => this.getReleases())
			.register('/install/:name?', ctx => this.install(ctx))
			.register('/uninstall/:name?', ctx => this.uninstall(ctx));
	}

	/**
	 * Shuts down the installed SDKs detect engine.
	 *
	 * @returns {Promise}
	 * @access public
	 */
	async deactivate() {
		await this.installed.deactivate();
	}

	/**
	 * Retreives a list of Titanium SDK releases.
	 *
	 * @returns {Promise<Object>} Resolves a map of versions to URLs.
	 * @access private
	 */
	async getReleases() {
		const { releases } = await fetch('https://s3-us-west-2.amazonaws.com/appc-mobilesdk-server/releases.json');
		const results = {};
		const is64 = architecture === 'x64';

		for (const release of releases) {
			const { build_type, name, url, version } = release;

			if (release.os !== os || name !== 'mobilesdk') {
				continue;
			}

			const is64build = /64bit/.test(build_type);

			if (os === 'osx' || (is64 && is64build) || (!is64 && !is64build)) {
				results[version] = {
					version: version.replace(/\.GA.*$/, ''),
					url
				};
			}
		}

		return results;
	}

	/**
	 * Retreives a list of Titanium SDK continuous integration builds.
	 *
	 * @param {String} branch - The branch to retreive.
	 * @returns {Promise<Object>} Resolves a map of versions to build info.
	 * @access private
	 */
	async getBuilds(branch) {
		const builds = await fetch(`http://builds.appcelerator.com/mobile/${branch || 'master'}/index.json`);
		const results = {};

		for (const build of builds) {
			const { build_type, filename, git_branch, git_revision } = build;
			const m = filename && filename.match(ciBuildRegExp);

			if (build_type !== 'mobile' || !m || !filename.includes(`-${os}`)) {
				continue;
			}

			const name = `${m[1]}.v${m[2]}`;

			results[name] = {
				version: m[1],
				ts:      m[2],
				githash: git_revision,
				date:    new Date(`${m.slice(4, 6).join('/')}/${m[3]} ${m.slice(6, 9).join(':')}`),
				url:     `http://builds.appcelerator.com/mobile/${git_branch}/${filename}`
			};
		}

		return results;
	}

	/**
	 * Install SDK service handler.
	 *
	 * @param {Context} ctx - A request context.
	 * @returns {Promise}
	 * @access private
	 */
	async install(ctx) {
		const { data, params } = ctx.request;
		let uri        = (data.uri || params.name || 'latest').trim();
		const uriMatch = data.uri && data.uri.match(uriRegExp);
		let file       = null;
		let url        = null;

		if (uriMatch && uriMatch[2]) {
			file = uriMatch[2];
		} else if (data.uri && fs.existsSync(data.uri)) {
			file = data.uri;
		}

		if (file) {
			file = expandPath(file);

			if (!isFile(file)) {
				throw new AppcdError(codes.BAD_REQUEST, 'Specified file does not exist');
			}

			if (!/\.zip$/.test(file)) {
				throw new AppcdError(codes.BAD_REQUEST, 'Specified file is not a zip file');
			}

			return this.extract({ ctx, file });
		}

		if (uriMatch && uriMatch[1]) {
			// we have a http url
			url = uriMatch[1];

		} else {
			// we have a version that needs to be resolved to a url
			const releases = await this.getReleases();
			let version = uri;
			if (version === 'latest') {
				version = Object.keys(releases).sort(rcompare)[0];
			}

			if (version && (releases[version] || releases[`${version}.GA`])) {
				// we have a ga release
				url = (releases[version] || releases[`${version}.GA`]).url;
			} else {
				// maybe a ci build?

				let { branches, defaultBranch } = await fetch('http://builds.appcelerator.com/mobile/branches.json');

				if (version) {
					const m = version.match(/^([A-Za-z0-9_]+?):(.+)$/);

					if (m) {
						// uri is a branch:version combo
						const branch = m[1];
						if (!branches.includes(branch)) {
							const err = new AppcdError(codes.BAD_REQUEST, `Invalid branch "${branch}"`);
							err.data = { branches };
							throw err;
						}
						branches = [ branch ];
						version = m[2];

					} else if (branches.includes(version)) {
						// uri is a ci branch, default to latest version
						branches = [ version ];
						version = 'latest';
					}
				}

				branches.sort((a, b) => {
					// force the default branch to the front
					return a === defaultBranch ? -1 : b.localeCompare(a);
				});

				url = await branches.reduce((promise, branch, i, arr) => {
					return promise.then(async url => {
						if (url) {
							return url;
						}
						const builds = await this.getBuilds(branch);
						const sortBuilds = (a, b) => {
							const r = rcompare(builds[a].version, builds[b].version);
							return r === 0 ? builds[b].ts.localeCompare(builds[a].ts) : r;
						};
						for (const name of Object.keys(builds).sort(sortBuilds)) {
							if (version === 'latest' || name === version || builds[name].githash === version) {
								return builds[name].url;
							}
						}
					});
				}, Promise.resolve());
			}
		}

		if (!url) {
			const msg = data.uri
				? `Unable to find any Titanium SDK releases or CI builds that match "${data.uri}"`
				: 'Unable to find any Titanium SDKs to install';
			throw new AppcdError(codes.NOT_FOUND, msg);
		}

		file = await this.download({ ctx, url });

		await this.extract({ ctx, file });

		if (!data.keep) {
			await fs.remove(file);
		}

		ctx.response = new Response(codes.OK, 'Installed successfully');
	}

	/**
	 * Downloads a Titanium SDK into the download directory.
	 *
	 * @param {Object} params - Various parameters.
	 * @param {Context} params.ctx - A dispatcher context.
	 * @param {String} params.url - The file URL to download.
	 * @returns {Promise<String>} Resolves the path of the downloaded file.
	 * @access private
	 */
	async download({ ctx, url }) {
		const downloadDir = this.config.home
			? expandPath(this.config.home, 'downloads')
			: tmp.tmpNameSync({ prefix: 'titanium-sdk-' });

		await fs.mkdirp(downloadDir);

		const tempFile = tmp.tmpNameSync({
			dir: downloadDir,
			prefix: 'titanium-sdk-',
			postfix: '.zip'
		});

		console.log(`Downloading ${highlight(url)} => ${highlight(tempFile)}`);
		const req = await request({ url });

		const out = fs.createWriteStream(tempFile);
		req.pipe(out);

		return new Promise((resolve, reject) => {
			req.on('response', response => {
				const { statusCode } = response;

				if (statusCode >= 400) {
					fs.removeSync(tempFile);
					return reject(new AppcdError(statusCode, STATUS_CODES[statusCode]));
				}

				out.on('close', () => {
					const m = url.match(/.*\/(.+\.zip)$/);
					let file = tempFile;
					if (m) {
						file = path.join(downloadDir, m[1]);
						fs.renameSync(tempFile, file);
					}
					resolve(file);
				});
			});

			req.once('error', reject);
		});
	}

	/**
	 * Extracts a Titanium SDK zip file to the install location.
	 *
	 * @param {Object} params - Various parameters.
	 * @param {Context} params.ctx - A dispatcher context.
	 * @param {String} params.file - The path to the Titanium SDK zip file to extract.
	 * @returns {Promise}
	 * @access private
	 */
	async extract({ ctx, file }) {
		const { overwrite } = ctx.request.data;
		const installLocation     = this.getInstallPaths()[0];
		const tempDir             = tmp.tmpNameSync({ prefix: 'titanium-sdk-install-' });
		let name;
		let dest;

		console.log(`Extracting ${highlight(file)} => ${highlight(tempDir)}`);

		await fs.mkdirp(tempDir);

		try {
			await new Promise((resolve, reject) => {
				yauzl.open(file, { lazyEntries: true }, (err, zipfile) => {
					if (err) {
						return reject(new AppcdError(`Invalid zip file: ${err.message || err}`));
					}

					// eslint-disable-next-line security/detect-non-literal-regexp
					const sdkDestRegExp = new RegExp(`^mobilesdk[/\\\\]${os}[/\\\\]([^/\\\\]+)`);
					let destCheck = false;

					zipfile.on('entry', entry => {
						// do a quick check to make sure the destination doesn't exist
						const m = !destCheck && entry.fileName.match(sdkDestRegExp);
						if (m) {
							name = m[1];
							dest = path.join(installLocation, name);
							destCheck = true;
							if (!overwrite && isDir(dest)) {
								return reject(new AppcdError(409, `Titanium SDK "${name}" already exists: ${dest}`));
							}
						}

						const fullPath = path.join(tempDir, entry.fileName);
						if (/\/$/.test(entry.fileName)) {
							fs.mkdirp(fullPath, () => zipfile.readEntry());
						} else {
							fs.mkdirp(path.dirname(fullPath), () => {
								zipfile.openReadStream(entry, (err, readStream) => {
									if (err) {
										return reject(err);
									}

									const writeStream = fs.createWriteStream(fullPath);
									writeStream.on('close', () => zipfile.readEntry());
									readStream.pipe(writeStream);
								});
							});
						}
					});

					zipfile.on('close', () => {
						resolve();
					});

					zipfile.readEntry();
				});
			});

			if (!name) {
				throw new AppcdError('Zip file does not appear to contain a Titanium SDK');
			}

			// install the sdk
			let src = path.join(tempDir, 'mobilesdk', os, name);
			console.log(`Installing SDK ${highlight(src)} => ${highlight(dest)}`);
			await fs.move(src, dest, { overwrite: true });

			// install the modules
			src = path.join(tempDir, 'modules');
			if (isDir(src)) {
				dest = path.resolve(installLocation, '..', '..', 'modules');

				for (const platform of fs.readdirSync(src)) {
					const srcPlatformDir = path.join(src, platform);
					if (!isDir(srcPlatformDir)) {
						continue;
					}

					for (const moduleName of fs.readdirSync(srcPlatformDir)) {
						const srcModuleDir = path.join(srcPlatformDir, moduleName);
						if (!isDir(srcModuleDir)) {
							continue;
						}

						for (const version of fs.readdirSync(srcModuleDir)) {
							const srcVersionDir = path.join(srcModuleDir, version);
							if (!isDir(srcVersionDir)) {
								continue;
							}

							const destDir = path.join(dest, platform, moduleName, version);

							if (!overwrite && isDir(destDir)) {
								console.log(`Module ${highlight(`${platform}/${moduleName}@${version}`)} already exists, skipping`);
								continue;
							}

							console.log(`Installing module ${highlight(`${platform}/${moduleName}@${version}`)} => ${highlight(destDir)}`);
							await fs.move(srcVersionDir, destDir, { overwrite: true });
						}
					}
				}
			}
		} finally {
			console.log(`Removing ${highlight(tempDir)}`);
			await fs.remove(tempDir);
		}
	}

	/**
	 * Deletes an installed Titanium SDK by name or path.
	 *
	 * @param {Context} ctx - A dispatcher context.
	 * @returns {Promise<Object>}
	 * @access private
	 */
	async uninstall(ctx) {
		const { data, params } = ctx.request;
		const uri              = (data.uri || params.name || '').trim();
		const results          = [];

		if (!uri) {
			throw new AppcdError(codes.BAD_REQUEST, 'Missing Titanium SDK name or path');
		}

		for (const sdk of this.installed.data) {
			if (sdk.name === uri || sdk.path === uri) {
				results.push(sdk);
				await fs.remove(sdk.path);
			}
		}

		if (!results.length) {
			throw new AppcdError(codes.NOT_FOUND, 'Unable to find any matching Titanium SDKs to uninstall');
		}

		return results;
	}

	/**
	 * Returns a list of Titanium SDK installation locations.
	 *
	 * @returns {Array.<String>}
	 * @access private
	 */
	getInstallPaths() {
		const paths = sdk.locations[process.platform].map(p => expandPath(p));
		const defaultPath = get(this.config, 'titanium.defaultInstallLocation');
		if (defaultPath) {
			paths.unshift(expandPath(defaultPath));
		}
		return unique(paths);
	}
}

/**
 * Fetches a URL and parses the result as JSON.
 *
 * @param {String} url - The URL to request.
 * @returns {Promise}
 */
function fetch(url) {
	return new Promise((resolve, reject) => {
		request({ url }, (err, response, body) => {
			if (err) {
				return reject(new AppcdError(err));
			}

			if (!response) {
				return reject(new AppcdError('Failed to get branches: no response'));
			}

			const { statusCode } = response;

			if (statusCode >= 400) {
				return reject(new AppcdError(statusCode, STATUS_CODES[statusCode]));
			}

			try {
				resolve(JSON.parse(body));
			} catch (e) {
				reject(new AppcdError(500, 'Failed to get branches: malformed JSON response'));
			}
		});
	});
}
