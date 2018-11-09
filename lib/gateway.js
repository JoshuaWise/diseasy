'use strict';
const River = require('wise-river');
const connect = require('./websocket');

const HEARTBEAT = 1;
const HEARTBEAT_ACK = 11;
const RECONNECT = 7;
const INVALID_SESSION = 9;
const HELLO = 10;
const DISPATCH = 0;

const RECONNECT_TRIES = 4;
const RECONNECT_BASE = 400;

/*
	A river that represents a Discord Gateway session. If reconnection fails,
	the session expires, or a protocol/policy error occurs, the river will be
	rejected. Otherwise, it will stay open until cancelled/rejected downstream.
 */

module.exports = (url, agentName, token, timeout) => new River((_, reject, write, free) => {
	if (typeof url !== 'string') throw new TypeError('Expected url to be a string');
	if (typeof agentName !== 'string') throw new TypeError('Expected agentName to be a string');
	if (typeof token !== 'string') throw new TypeError('Expected token to be a string');
	if (typeof timeout !== 'number') throw new TypeError('Expected timeout to be a number');
	let socketClose = () => {};
	let lastConnect = 0;
	let resume = null;

	const reconnect = () => {
		if (!resume) throw new Error('Session was never started');
		socketClose(1001);
		let failures = 0;
		const attempt = () => {
			connect(url, timeout).then(listen, (err) => {
				if (++failures >= RECONNECT_TRIES) reject(err);
				else setTimeout(attempt, RECONNECT_BASE * failures ** 2);
			});
		};
		setTimeout(attempt, Math.max(100, 5500 - (Date.now() - lastConnect)));
	};

	const listen = (socket) => {
		let heartbeatAcknowledged = true;
		const opcodes = new Map([
			[RECONNECT, reconnect],
			[HEARTBEAT, () => { socket.send({ op: 1, d: resume && resume.d.seq }); }],
			[HEARTBEAT_ACK, () => { heartbeatAcknowledged = true; }],
			[INVALID_SESSION, ({ d: shouldResume }) => {
				if (shouldResume) reconnect();
				else throw new Error('Session was rejected or expired');
			}],
			[HELLO, ({ d: { heartbeat_interval } }) => {
				River.every(Math.min(Math.max(1000, ~~heartbeat_interval || 30000), 55000))
					.until(socket.fate)
					.consume(() => {
						if (!heartbeatAcknowledged) return reconnect();
						heartbeatAcknowledged = false;
						socket.send({ op: 1, d: resume && resume.d.seq });
					})
					.catch(reject);
				socket.send(resume || { op: 2, d: {
					token,
					presence: { since: null, game: null, status: 'online', afk: false },
					properties: { $os: process.platform, $browser: agentName, $device: agentName },
				} });
			}],
			[DISPATCH, ({ t: event, d: data, s: seq }) => {
				if (event === 'READY') {
					resume = { op: 6, d: { token, session_id: data.session_id, seq } };
				} else if (resume) {
					resume.d.seq = seq;
					write({ event, data });
				}
			}],
		]);
		lastConnect = Date.now();
		socketClose = socket.close;
		socket.fate.catch(reject);
		socket.receive()
			.filter((msg) => !!msg && opcodes.has(msg.op))
			.consume((msg) => opcodes.get(msg.op)(msg))
			.catch(reject);
	};

	free(() => socketClose(1001));
	connect(url, timeout).then(listen, reject);
});
