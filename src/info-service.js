import DetectEngine from 'appcd-detect';
import gawk from 'gawk';
import sortObject from 'sort-object-keys';
import version from './version';

import { DataServiceDispatcher } from 'appcd-dispatcher';
import {
	modules,
	sdk,
	TitaniumModule,
	TitaniumSDK,
} from 'titaniumlib';
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
			paths:               modules.locations[process.platform],
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
				if (!modules[module.platform][module.moduleid]) {
					modules[module.platform][module.moduleid] = {};
				}
				modules[module.platform][module.moduleid][module.version] = module;
			}

			// sort the platforms and versions
			modules = sortObject(modules);
			for (const platform of Object.keys(modules)) {
				modules[platform] = sortObject(modules[platform]);
				for (const id of Object.keys(modules[platform])) {
					modules[platform][id] = sortObject(modules[platform][id], version.compare);
				}
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
			paths: sdk.locations[process.platform],
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
