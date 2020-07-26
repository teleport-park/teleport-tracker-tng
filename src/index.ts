import * as debug from 'debug';
import {ApiClient, IApiEvent} from "./api-client";
import {AbstractTracker, ITrackerStatus, PlayvrTracker} from "./tracker";
import {createConfigurationFromEnvs} from "./config";

const logger = debug('app');

// bootstrap configuration from environmental variables
const config = createConfigurationFromEnvs();
logger('Configuration for app: %o', config);

const apiClient = new ApiClient(config.serverUri, config.serverToken, {
	...(config.serverRetryInterval ? {retryInterval: config.serverRetryInterval} : {}),
	...(config.serverRequestTimeout ? {requestTimeout: config.serverRequestTimeout} : {}),
	...(config.serverBatchSize ? {batchSize: config.serverBatchSize} : {}),
});

config.machines
	.map((spec) => {
		let tracker: AbstractTracker;
		switch (spec.type) {
			case "playvr":
				tracker = new PlayvrTracker(spec.id, spec.address);
				break;
			case "polygon":
			default:
				throw new Error('Unsupported machine type: ' + spec.type);
		}

		tracker.on('status', (status: ITrackerStatus) => {
			return apiClient.send({
				id: 'someId',
				sub_id: status.id,
				type: spec.type as IApiEvent['type'],

				// game is optional
				...(status.game ? {game: {id: status.game, name: status.game}} : {}),

				status: status.status,
				timestamp: status.timestamp,
				local_timestamp: new Date(),
				sandbox: true,
			});
		});

		return tracker;
	});
