'use strict';
const superagent = require('superagent');
const gateway = require('./gateway');
const pkg = require('../package.json');

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'del', 'head', 'trace'];

class DiscordClient {
	constructor({ token, httpApiVersion = '6', gatewayApiVersion = '6', timeout = 15000 }) {
		if (typeof token !== 'string') throw new TypeError('Expected token to be a string');
		if (typeof httpApiVersion !== 'string') throw new TypeError('Expected httpApiVersion to be a string');
		if (typeof gatewayApiVersion !== 'string') throw new TypeError('Expected gatewayApiVersion to be a string');
		if (!Number.isInteger(timeout) || timeout < 0) throw new TypeError('Expected timeout to be a positive integer');
		if (/[^0-9a-z+/=.]/i.test(token)) throw new TypeError('Invalid token');
		if (/[^0-9.]/.test(httpApiVersion)) throw new TypeError('Invalid httpApiVersion');
		if (/[^0-9.]/.test(gatewayApiVersion)) throw new TypeError('Invalid gatewayApiVersion');
		if (timeout > 0x7fffffff) throw new RangeError('Invalid timeout value');

		const agent = superagent.agent()
			.timeout(timeout)
			.set('Authorization', `Bot ${token}`)
			.set('User-Agent', `DiscordBot (${pkg.homepage}, ${pkg.version})`);

		const baseUrl = `https://discordapp.com/api/v${httpApiVersion}/`;
		for (const method of METHODS) {
			this[method] = path => agent[method](baseUrl + String(path).replace(/^\/+/, ''));
		}

		// TODO
		// this.gateway = () => agent.get(baseUrl + 'gateway')
		// 	.then(({ body: { url } }) =>
		// 		gateway(url + `?v=${gatewayApiVersion}&encoding=json`, pkg.name, token, timeout));
	}
}

module.exports = DiscordClient;
