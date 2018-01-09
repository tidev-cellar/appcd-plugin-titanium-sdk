import DetectEngine from 'appcd-detect';
import fs from 'fs';
import gawk from 'gawk';
import path from 'path';
import sortObject from 'sort-object-keys';
import version from './version';

import { DataServiceDispatcher } from 'appcd-dispatcher';
import { expandPath } from 'appcd-path';
import { isDir } from 'appcd-fs';

/**
 * Common search paths for Titanium SDKs.
 * @type {Object}
 */
const sdkLocations = {
	darwin: [
		'~/Library/Application Support/Titanium',
		'/Library/Application Support/Titanium'
	],
	linux: [
		'~/.titanium'
	],
	win32: [
		'%ProgramData%\\Titanium',
		'%APPDATA%\\Titanium',
		'%ALLUSERSPROFILE%\\Application Data\\Titanium'
	]
};

/**
 * ?
 * @type {Object}
 */
const osNames = {
	darwin: 'osx',
	linux: 'linux',
	win32: 'win32'
};

/**
 * Titanium SDK information object.
 */
class TitaniumSDK {
	/**
	 * Checks if the specified directory contains a Titanium SDK, then parses the SDK's
	 * `manifest.json`.
	 *
	 * @param {String} dir - The directory to scan.
	 * @access public
	 */
	constructor(dir) {
		if (typeof dir !== 'string' || !dir) {
			throw new TypeError('Expected directory to be a valid string');
		}

		dir = expandPath(dir);
		if (!isDir(dir)) {
			throw new Error('Directory does not exist');
		}

		this.name     = path.basename(dir);
		this.manifest = null;
		this.path     = dir;

		try {
			const manifestFile = path.join(dir, 'manifest.json');
			this.manifest = JSON.parse(fs.readFileSync(manifestFile));
			if (!this.manifest || typeof this.manifest !== 'object') {
				throw new Error();
			}
		} catch (e) {
			throw new Error('Directory does not contain a valid manifest.json');
		}
	}
}

/**
 * Cached regex for matching key/values in properties files.
 * @type {RegExp}
 */
const iniRegExp = /^(?!\s*#)\s*([^:\s]+)\s*:\s*(.+?)\s*$/;

/**
 * Titanium Module information object.
 */
class TitaniumModule {
	/**
	 * Checks if the specified directory contains a Titanium Module.
	 *
	 * @param {String} dir - The directory to scan.
	 * @access public
	 */
	constructor(dir) {
		if (typeof dir !== 'string' || !dir) {
			throw new TypeError('Expected directory to be a valid string');
		}

		dir = expandPath(dir);
		if (!isDir(dir)) {
			throw new Error('Directory does not exist');
		}

		this.manifest = {};
		this.path     = dir;
		this.platform = path.basename(path.dirname(path.dirname(dir)));
		this.version  = path.basename(dir);

		try {
			const manifestFile = path.join(dir, 'manifest');

			for (const line of fs.readFileSync(manifestFile, 'utf8').split(/\r?\n/)) {
				const m = line.match(iniRegExp);
				if (m) {
					this.manifest[m[1]] = m[2];
				}
			}
		} catch (e) {
			throw new Error('Directory does not contain a valid manifest');
		}

		if (this.manifest.platform) {
			this.platform = this.manifest.platform;
		}
		if (this.platform === 'iphone') {
			this.platform = 'ios';
		}
		if (!this.platform) {
			throw new Error('Unable to determine module platform');
		}

		if (this.manifest.version) {
			this.version = this.manifest.version;
		}
		if (!this.version) {
			throw new Error('Unable to determine module version');
		}
	}
}

/**
 * The Titanium SDK info service.
 */
export default class TitaniumInfoService extends DataServiceDispatcher {
	/**
	 * Starts detecting Titanium SDKs and modules.
	 *
	 * @param {Config} cfg - An Appc Daemon config object.
	 * @returns {Promise}
	 * @access public
	 */
	async activate(cfg) {
		this.config = cfg;

		this.data = gawk({
			modules: {},
			sdks: []
		});

		await this.initModules();
		await this.initSDKs();
	}

	/**
	 * Initializes the Titanium Modules detect engine.
	 *
	 * @returns {Promise}
	 * @access private
	 */
	async initModules() {
		this.modulesDetectEngine = new DetectEngine({
			checkDir(dir) {
				try {
					return new TitaniumModule(dir);
				} catch (e) {
					// 'dir' is not a Titanium SDK
				}
			},
			depth:               3,
			multiple:            true,
			name:                'titanium-sdk:modules',
			paths:               sdkLocations[process.platform].map(dir => expandPath(dir, 'modules')),
			recursive:           true,
			recursiveWatchDepth: 0,
			redetect:            true,
			watch:               true
		});

		this.modulesDetectEngine.on('results', results => {
			let modules = {};

			// convert the list of modules into buckets by platform and version
			for (const module of results) {
				if (!modules[module.platform]) {
					modules[module.platform] = {};
				}
				modules[module.platform][module.version] = module;
			}

			// sort the platforms and versions
			modules = sortObject(modules);
			for (const platform of Object.keys(modules)) {
				modules[platform] = sortObject(modules[platform], version.compare);
			}

			gawk.set(this.data.modules, modules);
		});

		await this.modulesDetectEngine.start();
	}

	/**
	 * Initializes the Titanium SDK detect engine.
	 *
	 * @returns {Promise}
	 * @access private
	 */
	async initSDKs() {
		this.sdkDetectEngine = new DetectEngine({
			checkDir(dir) {
				try {
					return new TitaniumSDK(dir);
				} catch (e) {
					// 'dir' is not a Titanium SDK
				}
			},
			depth:    1,
			multiple: true,
			name:     'titanium-sdk:sdks',
			paths: sdkLocations[process.platform].map(dir => {
				return expandPath(dir, 'mobilesdk', osNames[process.platform]);
			}),
			processResults(results) {
				results.sort((a, b) => {
					return version.compare(
						a.manifest && a.manifest.version,
						b.manifest && b.manifest.version
					);
				});
			},
			recursive:           true,
			recursiveWatchDepth: 0,
			redetect:            true,
			watch:               true
		});

		this.sdkDetectEngine.on('results', results => {
			gawk.set(this.data.sdks, results);
		});

		await this.sdkDetectEngine.start();
	}

	/**
	 * Stops the detect engines.
	 *
	 * @returns {Promise}
	 * @access public
	 */
	async deactivate() {
		if (this.modulesDetectEngine) {
			await this.modulesDetectEngine.stop();
			this.modulesDetectEngine = null;
		}

		if (this.sdkDetectEngine) {
			await this.sdkDetectEngine.stop();
			this.sdkDetectEngine = null;
		}
	}
}
