'use strict';
const DiscordClient = require('./client');

module.exports = function discord(options) {
	return new DiscordClient(options == null ? {} : options);
};

try { require('wise-inspection')(require('wise-promise')); } catch (_) {}
