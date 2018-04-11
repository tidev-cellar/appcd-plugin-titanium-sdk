import Dispatcher from 'appcd-dispatcher';
import ModuleListInstalledService from './module-list-installed-service';

import { expandPath } from 'appcd-path';
import { get, unique } from 'appcd-util';
import { modules } from 'titaniumlib';

/**
 * Defines a service endpoint for listing Titanium modules.
 */
export default class ModuleService extends Dispatcher {
	/**
	 * Registers all of the endpoints and initializes the installed modules detect engine.
	 *
	 * @param {Object} cfg - The Appc Daemon config object.
	 * @returns {Promise}
	 * @access public
	 */
	async activate(cfg) {
		this.config = cfg;

		this.installed = new ModuleListInstalledService();
		await this.installed.activate(cfg);

		this.register([ '/', '/list' ], (ctx, next) => {
			ctx.path = '/list/installed';
			return next();
		});

		this.register('/list/installed', this.installed);

		this.register('/list/locations', ctx => this.getInstallPaths());
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
	 * Returns a list of Titanium module installation locations.
	 *
	 * @returns {Array.<String>}
	 * @access private
	 */
	getInstallPaths() {
		const paths = modules.locations[process.platform].map(p => expandPath(p));
		const defaultPath = get(this.config, 'titanium.modules.defaultInstallLocation');
		if (defaultPath) {
			paths.unshift(expandPath(defaultPath));
		}
		return unique(paths);
	}
}
