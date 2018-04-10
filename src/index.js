/* istanbul ignore if */
if (!Error.prepareStackTrace) {
	require('source-map-support/register');
}

import BuildService from './build-service';
import ModuleService from './module-service';
import SDKService from './sdk-service';

const buildSvc  = new BuildService();
const moduleSvc = new ModuleService();
const sdkSvc    = new SDKService();

/**
 * Wires up plugin services.
 *
 * @param {Object} cfg - An Appc Daemon config object
 * @returns {Promise}
 */
export async function activate(cfg) {
	await buildSvc.activate(cfg);
	appcd.register('/build', buildSvc);

	await moduleSvc.activate(cfg);
	appcd.register([ '/module', '/module/list' ], (ctx, next) => {
		ctx.path = '/module/list/installed';
		return next();
	});
	appcd.register('/module/list/installed', moduleSvc);

	await sdkSvc.activate(cfg);
	appcd.register('/sdk', sdkSvc);
}

/**
 * Shuts down plugin services.
 *
 * @returns {Promise}
 */
export async function deactivate() {
	await buildSvc.deactivate();
	await moduleSvc.deactivate();
	await sdkSvc.deactivate();
}
