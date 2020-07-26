import * as debug from 'debug';
import * as url from 'url';
import * as Ajv from 'ajv';
import {JSONSchema7} from "json-schema";


export interface IConfiguration {
	serverUri: string;
	serverToken?: string;
	serverRequestTimeout?: number;
	serverRetryInterval?: number;
	serverBatchSize?: number;
	machines: IConfigurationMachine[];
}

export interface IConfigurationMachine {
	id: string;
	type: 'playvr' | 'polygon';
	address: string;
}

interface IConfigurationEnvs {
	SERVER_URI: string;
	SERVER_TOKEN?: string;
	SERVER_REQUEST_TIMEOUT?: number;
	SERVER_RETRY_INTERVAL?: number;
	SERVER_BATCH_SIZE?: number;
	MACHINES: string;
}

const configurationEnvsSchema: JSONSchema7 = {
	type: 'object',
	required: ['SERVER_URI'],
	properties: {
		SERVER_URI: {type: 'string', minLength: 1, format: 'uri', default: 'http://tracker.infra.teleport-park.com'},
		SERVER_TOKEN: {type: 'string', minLength: 1},
		SERVER_REQUEST_TIMEOUT: {type: 'integer', minimum: 0},
		SERVER_RETRY_INTERVAL: {type: 'integer', minimum: 0},
		SERVER_BATCH_SIZE: {type: 'integer', minimum: 1},
	},
	patternProperties: {
		'^MACHINE_': {type: 'string', format: 'uri'}
	},
	additionalProperties: false,
}

const configurationEnvsValidator = new Ajv({
	useDefaults: true,
	removeAdditional: true,
	coerceTypes: true
}).compile(configurationEnvsSchema);

export function createConfigurationFromEnvs(): IConfiguration {
	const logger = debug('configuration:env');
	logger('Creating configuration from envs %o', [
		...Object.keys(configurationEnvsSchema.properties),
		...Object.keys(configurationEnvsSchema.patternProperties),
	]);

	// validating environments to have filtered ones
	const envs: IConfigurationEnvs = {...process.env} as any;
	if (!configurationEnvsValidator(envs)) {
		throw new Error('Validation of config failed: ' + configurationEnvsValidator.errors);
	}
	logger('Environmental config found: %o', envs);

	// detect machines
	const machines = Object.keys(envs)
		.filter((key) => key.match(/^MACHINE_/))
		.map((key) => envs[key])
		.map((spec) => {

			let {username: id, password: type} = new url.URL(spec);

			if (!id) {
				throw new Error('Username part (as id) is not set, but mandatory: ' + spec);
			}

			switch ((typeof type === 'string') ? type.toLowerCase() : undefined) {
				case 'polygon':
				case 'playvr':
					type = type.toLowerCase();
					break;
				case undefined:
				case '':
					throw new Error('Password part (as type) is not set, but mandatory: ' + spec);
				default:
					throw new Error('Password part (as type) is unsupported type, but mandatory string: ' + spec);
			}

			// generate output
			return {id, type, address: url.format({...url.parse(spec), auth: undefined})} as IConfigurationMachine;
		});

	machines.forEach((m) => logger('Found machine: type=%s id=%s address=%s', m.type, m.id, m.address));

	return {
		serverUri: envs.SERVER_URI,
		serverToken: envs.SERVER_TOKEN,
		...(envs.SERVER_REQUEST_TIMEOUT ? {serverRequestTimeout: envs.SERVER_REQUEST_TIMEOUT} : {}),
		...(envs.SERVER_RETRY_INTERVAL ? {serverRetryInterval: envs.SERVER_RETRY_INTERVAL} : {}),
		...(envs.SERVER_BATCH_SIZE ? {serverBatchSize: envs.SERVER_BATCH_SIZE} : {}),
		machines,
	}
}
