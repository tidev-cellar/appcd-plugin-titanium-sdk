/* istanbul ignore if */
if (!Error.prepareStackTrace) {
	require('source-map-support/register');
}

import TitaniumInfoService from './info-service';

const info = new TitaniumInfoService();

/**
 * Wires up plugin services.
 *
 * @param {Config} cfg - An Appc Daemon config object
 * @returns {Promise}
 */
export async function activate(cfg) {
	await info.activate(cfg);
	appcd.register('/info', info);
}

/**
 * Shuts down plugin services.
 *
 * @returns {Promise}
 */
export async function deactivate() {
	await info.deactivate();
}
