# easy-discord

Easily make requests to the [Discord HTTP API](https://discordapp.com/developers/docs/reference#http-api).

```js
const discord = require('easy-discord')({ token: 'xyz' });

discord.post('/channels/123/messages')
	.send({ content: 'Hello world!' })
	.end();
```

You can make any type of request (GET, POST, DELETE, etc.), and each corresponding method returns a [superagent](https://github.com/visionmedia/superagent) request object.

You can also access the [Gateway WebSocket API](https://discordapp.com/developers/docs/reference#gateway-websocket-api).

```js
const message = await discord.gateway()
	.filter(({ event }) => event === 'MESSAGE_CREATE');
	.find(({ data }) => data.content === 'I summon you, bot!');
```

The `gateway()` method returns a [River](https://github.com/JoshuaWise/wise-river), which is a high-level [async iterable](https://github.com/tc39/proposal-async-iteration) object.

Heartbeats, session resumes, and other necessary ritual are automatically handled for you.

To learn more about the different kinds of events you can receive, read [here](https://discordapp.com/developers/docs/topics/gateway#commands-and-events-gateway-events).
