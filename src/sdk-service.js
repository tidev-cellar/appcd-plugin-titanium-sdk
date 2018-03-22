import DetectEngine from 'appcd-detect';
import gawk from 'gawk';
import version from './version';

import { DataServiceDispatcher } from 'appcd-dispatcher';
import { sdk, TitaniumSDK } from 'titaniumlib';

/**
 * The Titanium SDK info service.
 */
export default class SDKService extends DataServiceDispatcher {
	/**
	 * Starts detecting Titanium SDKs and modules.
	 *
	 * @param {Config} cfg - An Appc Daemon config object.
	 * @returns {Promise}
	 * @access public
	 */
	async activate(cfg) {
		this.config = cfg;
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
