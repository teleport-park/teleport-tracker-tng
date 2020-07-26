import * as util from 'util';
import * as async from 'async';
import * as debug from 'debug';
import * as request from 'request-promise';

export interface IApiEvent {
	id: string;
	sub_id?: string;
	type: 'tvr' | 'tng' | 'tpg';
	status: 'idle' | 'playing';
	comment?: string;
	timestamp: Date;
	local_timestamp: Date;
	game?: {
		id: string;
		name?: string;
	};
	sandbox?: boolean;
}

export interface IApiClientOptions {
	batchSize: number;
	retryInterval: number;
	requestTimeout: number;
}

export class ApiClient {

	protected readonly debug: debug.IDebugger = debug('api-client');
	protected readonly httpClient: request.RequestPromiseAPI;
	protected readonly queue: async.AsyncCargo;
	protected readonly options: IApiClientOptions;
	protected sequenceNo: number = 1;

	public constructor(address: string, token?: string, opts?: Partial<IApiClientOptions>) {
		this.options = {
			batchSize: 5,
			retryInterval: 1000,
			requestTimeout: 1000,
			...opts,
		};
		this.debug('Initializing with options: %o', this.options);

		// Initialize http client
		this.debug('Initializing HTTP client address=%s, token=%s', address, token);
		this.httpClient = request.defaults({
			baseUrl: address,
			headers: {
				...(token ? {Authorization: util.format('Bearer %s')} : {}),
			},
			json: true,
		});

		// Initialize queue
		this.debug('Initialized retryable queue for spooling cargo=%i', this.options.batchSize);
		this.queue = async.queue(async (event: IQueueTask, next) => {
			try {
				this.debug('Flushing %d events with starting seqNo=%d', 1, event.seqNo);
				await this.doSend(event);
				next();
			} catch (e) {
				this.debug('Error cargo delivery: %s', e.message);
				next(e);
			}
		}, 1); // TODO batch size

		this.debug('Initialization done');
	}

	public async send(event: IApiEvent) {
		this.queue.push({
			seqNo: this.sequenceNo++,
			event,
		} as IQueueTask);
	}

	public async destroy() {
		this.debug('Destroying API client');
		// TODO drain receiving data and shutdown
		this.queue.kill();
	}

	protected async doSend(event: IQueueTask): Promise<void> {
		do {
			try {
				const payload: IApiEvent = event.event;
				await this.httpClient.post('/events', {
					body: payload,
					json: true,
					timeout: this.options.requestTimeout,
				});
				break;
			} catch (e) {
				this.debug('Send failed: %s, retry in %d sec', e.message, this.options.retryInterval / 1000);
				await new Promise((res) => setTimeout(res, this.options.retryInterval));
			}
		} while (true);
	}

}

interface IQueueTask {
	seqNo: number;
	event: IApiEvent;
}
