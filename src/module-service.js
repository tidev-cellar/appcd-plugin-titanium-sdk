import DetectEngine from 'appcd-detect';
import gawk from 'gawk';
import sortObject from 'sort-object-keys';

import { compare } from './version';
import { DataServiceDispatcher } from 'appcd-dispatcher';
import { modules, TitaniumModule } from 'titaniumlib';

/**
 * Defines a service endpoint for listing Titanium modules.
 */
export default class ModuleService extends DataServiceDispatcher {
	/**
	 * Starts detecting Titanium SDKs and modules.
	 *
	 * @param {Object} cfg - An Appc Daemon config object.
	 * @returns {Promise}
	 * @access public
	 */
	async activate(cfg) {
		this.config = cfg;
		this.data = gawk({});

		this.detectEngine = new DetectEngine({
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

		this.detectEngine.on('results', results => {
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
					modules[platform][id] = sortObject(modules[platform][id], compare);
				}
			}

			gawk.set(this.data, modules);
		});

		await this.detectEngine.start();
	}

	/**
	 * Stops the detect engine.
	 *
	 * @returns {Promise}
	 * @access public
	 */
	async deactivate() {
		if (this.detectEngine) {
			await this.detectEngine.stop();
			this.detectEngine = null;
		}
	}
}
