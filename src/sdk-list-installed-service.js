import DetectEngine from 'appcd-detect';
import gawk from 'gawk';

import { compare } from './version';
import { DataServiceDispatcher } from 'appcd-dispatcher';
import { sdk, TitaniumSDK } from 'titaniumlib';

/**
 * Detects installed Titanium SDKs.
 */
export default class SDKListInstalledService extends DataServiceDispatcher {
	/**
	 * Starts detecting Titanium SDKs.
	 *
	 * @param {Object} cfg - The Appc Daemon config object.
	 * @returns {Promise}
	 * @access public
	 */
	async activate(cfg) {
		this.data = gawk([]);

		this.detectEngine = new DetectEngine({
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
			paths:    sdk.locations[process.platform],
			processResults(results) {
				results.sort((a, b) => {
					return compare(
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

		this.detectEngine.on('results', results => gawk.set(this.data, results));

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
