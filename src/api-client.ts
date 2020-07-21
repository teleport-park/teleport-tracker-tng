

export interface IEvent {
	id: string;
	type: 'tvr' | 'tng' | 'tpg';
	status: 'idle' | 'playing';
	comment?: string;
	timestamp: Date;
	local_timestamp: Date;
	game?: {
		id: string;
		name?: string;
	};
}

export class ApiClient {

	public constructor(address: string) {
	}

	public send(event: IEvent) {

	}

}
