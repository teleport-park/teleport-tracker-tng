import * as debug from 'debug';
import * as async from 'async';
import * as request from "request-promise";
import {EventEmitter} from "events";

export interface ITracker extends EventEmitter {
	on(event: 'status', listener: (status: ITrackerStatus) => void);

	on(event: 'error', listener: (err: Error) => void);
}

export abstract class AbstractTracker extends EventEmitter implements ITracker {

	protected readonly debug: debug.IDebugger;
	protected readonly httpClient: request.RequestPromiseAPI;
	protected readonly process: Promise<any>;
	protected stop: boolean;

	protected constructor(id: string, address: string, options?: Partial<request.Options>) {
		super();

		this.debug = debug('tracker:' + id);

		this.debug('Initializing HTTP client: address=%s', address);
		this.httpClient = request.defaults({
			baseUrl: address,
			json: true,
			...options,
		});

		this.debug('Initializing repeating queue')
		this.stop = false;
		this.process = async.until(
			((cb) => cb(null, this.stop)) as any,
			async (next) => {
				// do status checking and send data to events
				try {
					const data = await this.getStatus();
					data.forEach((status) => this.emit('status', status));
				} catch (e) {
					this.emit('error', e);
				}

				// wait for N seconds
				setTimeout(next, 1000);
			}
		);

		this.debug('Initialization done');
	}

	public async destroy(): Promise<this> {
		this.debug('Destroying tracker');
		this.stop = true;
		await this.process;
		return this;
	}

	protected abstract getStatus(): Promise<ITrackerStatus[]>;

}

export interface ITrackerStatus {
	id: string;
	status: 'idle' | 'playing';
	timestamp: Date;
	game?: string;
}
