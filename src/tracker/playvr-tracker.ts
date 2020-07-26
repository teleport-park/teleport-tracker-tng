import {AbstractTracker, ITrackerStatus} from "./tracker";

/**
 * PlayVR tracker
 */
export class PlayvrTracker extends AbstractTracker {

	public constructor(id: string, address: string) {
		super(id, address, {headers: {Referer: '/new_control_app/'}});
	}

	protected async getStatus() {
		const {player_sessions: response}: IPlayerSessionsResponse = await this.httpClient.get('/player_sessions');
		const timestamp = new Date();

		// get locations and build base map
		const locations = response.space.reduce((acc, cube) => {
			for (const machine of cube.game_machines) {
				acc.set(machine.name, {status: 'idle', timestamp});
			}
			return acc;
		}, new Map<ITrackerStatus['id'], Omit<ITrackerStatus, 'id'>>());

		// iterate over all player sessions and detect game runs
		const gameRuns = response.player_sessions
			.reduce((acc, session) => {
				acc.push(...session.players)
				return acc;
			}, [])
			.map((player) => player.gameRun as IGameRun)
			.filter((gameRun) => gameRun && gameRun.uuid)


		// map runs over locations
		for (const gameRun of gameRuns) {
			if (!gameRun.position || !gameRun.position.name) {
				throw new Error('Unable to take location over game run');
			}
			const position = gameRun.position.name;
			if (!locations.has(position)) {
				throw new Error('Unable to detect position from existing game run');
			}

			// set new location
			locations.set(position, {
				status: 'playing',
				timestamp,
				game: getGameName(gameRun.gameDisplayName),
			});
		}
		return [...locations.entries()].map(([location, status]) => ({
			id: location,
			...status,
		}));
	}

}

interface ICube {
	name: string;
	type: string;
	game_machines: IGameMachine[];
}

interface IGameMachine {
	name: string;
	ip: string;
}

interface IPlayerSession {
	uuid: string;
	server_time_now: string;
	players: Array<{
		player_uuid: string;
		player_name: string;
		gameRun: IGameRun | {} | null;
	}>;
}

interface IGameRun {
	uuid: string;
	gameDisplayName: Record<string, string>
	position: {
		ip: string;
		name: string; // interesting
		type: string;
		zone: string;
	}
}

interface IPlayerSessionsResponse {
	player_sessions: {
		space: ICube[];
		player_sessions: IPlayerSession[];
	}
}

function getGameName(displayName: Record<string, string> | string): string {
	const defaultGameName = '<noname game>';
	if (!displayName) {
		return defaultGameName;
	} else if (typeof displayName === 'string') {
		return displayName;
	} else if (displayName['eng']) {
		return displayName['eng'];
	} else if (displayName['rus']) {
		return displayName['rus'];
	} else {
		// find first non-empty string
		return Object.values(displayName).filter((name) => !!name)[0] || defaultGameName;
	}
}
