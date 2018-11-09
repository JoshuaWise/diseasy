'use strict';
const Promise = require('wise-promise');
const River = require('wise-river');
const WebSocket = require('ws');

/*
	A high-level WebSocket interface that uses promises and rivers, implements
	JSON messaging, and interprets any server-initiated close as an error.
	Useful guarantees are provided:
		- The send() method will not throw due to connection state (no racing)
		- The 'fate' promise can only be fulfilled by invoking close()
		- The 'receive' rivers can only be rejected by downstream code
		- No more messages will be received after invoking close()
		- No more messages will be received if a JSON parsing error occurs
 */

module.exports = (url, timeout) => new Promise((resolve, reject) => {
	if (typeof url !== 'string') throw new TypeError('Expected url to be a string');
	if (typeof timeout !== 'number') throw new TypeError('Expected timeout to be a number');
	const ws = new WebSocket(url, { perMessageDeflate: false, handshakeTimeout: timeout });
	ws.on('error', reject);
	ws.once('open', () => {
		ws.removeListener('error', reject);
		resolve(Object.freeze(wrap.call({}, ws)));
	});
});

function wrap(ws) {
	this.fate = new Promise((resolve, reject) => {
		ws.on('error', reject);
		ws.on('close', (code, reason) => reject(new Error(`The websocket connection was aborted by the server (${code} ${reason})`)));
		this.close = (code = 1000) => {
			resolve();
			ws.close(code);
		};
		this.send = (message) => {
			message = JSON.stringify(message);
			if (ws.readyState === WebSocket.OPEN) ws.send(message);
		};
		this.receive = () => new River((done, _, write, free) => {
			const receiver = (message) => {
				if (ws.readyState !== WebSocket.OPEN) return;
				try {
					message = JSON.parse(message);
				} catch (err) {
					reject(new Error('Invalid JSON was received'));
					ws.close(1008);
					return;
				}
				write(message);
			};
			this.fate.then(done, done);
			ws.on('message', receiver);
			free(() => ws.removeListener('message', receiver));
		});
	});
	return this;
}
