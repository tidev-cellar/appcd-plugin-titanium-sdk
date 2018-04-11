import Dispatcher from 'appcd-dispatcher';

import { AppcdError } from 'appcd-response';

/**
 * Service for building a Titanium application.
 */
export default class BuildService extends Dispatcher {
	/**
	 * Wires up the build service endpoint.
	 *
	 * @returns {Promise}
	 * @access public
	 */
	async activate() {
		this.register('/', ctx => {
			throw new AppcdError(501, 'Not Implemented');
		});
	}

	/**
	 * Shutsdown the build service.
	 *
	 * @returns {Promise}
	 * @access public
	 */
	async deactivate() {
		//
	}
}
