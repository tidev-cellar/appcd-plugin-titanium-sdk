/* istanbul ignore if */
if (!Error.prepareStackTrace) {
	require('source-map-support/register');
}

import ModuleService from './module-service';
import SDKService from './sdk-service';

const moduleSvc = new ModuleService();
const sdkSvc = new SDKService();

/**
 * Wires up plugin services.
 *
 * @param {Config} cfg - An Appc Daemon config object
 * @returns {Promise}
 */
export async function activate(cfg) {
	await moduleSvc.activate(cfg);
	appcd.register('/module', moduleSvc);

	await sdkSvc.activate(cfg);
	appcd.register('/sdk', sdkSvc);
}

/**
 * Shuts down plugin services.
 *
 * @returns {Promise}
 */
export async function deactivate() {
	await moduleSvc.deactivate();
	await sdkSvc.deactivate();
}
