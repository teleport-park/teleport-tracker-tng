import * as request from 'request-promise';
import * as url from 'url';


const httpClient = request.defaults({
	json: true,
	headers: {
		Referer: '/new_control_app/',
	},
});


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
		space: any[];
		player_sessions: Array<{
			uuid: string;
			players: Array<{
				player_uuid: string;
				player_name: string;
				gameRun: IGameRun | {} | null;
			}>
		}>
	}
}


export async function check(address: string, name?: string) {
	// const uri = new URL(address);

	// request.defaults()

	const {player_sessions: {player_sessions: result}} = await httpClient.get('/player_sessions', {
		baseUrl: address,
	}) as IPlayerSessionsResponse;


	for (const session of result) {
		for (const player of session.players.filter((p) => p.gameRun && (p.gameRun as IGameRun).uuid)) {
			console.dir(player, {depth: 10});
			// compose player and gameRun into result
		}
	}

}
