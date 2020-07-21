import * as async from 'async';
import {check} from "./playvr-checker";

check('http://86.57.157.90:8084').then((res) => {
	console.log(res)
}).catch((err) => {
	console.error(err);
});


async.forever(async (next) => {
	console.log('Flushing');

	setTimeout(next, 1000);
}, (err) => {
	console.error(err);
});



