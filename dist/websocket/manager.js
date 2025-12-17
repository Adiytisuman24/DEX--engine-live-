"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebsocket = void 0;
const queue_1 = require("../queue");
const setupWebsocket = (fastify) => {
    queue_1.redisSubscriber.subscribe(queue_1.ORDERS_CHANNEL);
    // Map of websocket connections
    const clients = new Set();
    queue_1.redisSubscriber.on('message', (channel, message) => {
        if (channel === queue_1.ORDERS_CHANNEL) {
            for (const client of clients) {
                if (client.readyState === 1) { // 1 = OPEN
                    client.send(message);
                }
            }
        }
    });
    fastify.register(async function (fastify) {
        fastify.get('/ws', { websocket: true }, (connection, req) => {
            const socket = connection.socket || connection;
            console.log('Client connected to WebSocket. Socket available:', !!socket);
            if (socket && (socket.on || socket.addEventListener)) {
                clients.add(socket);
                socket.on('close', () => clients.delete(socket));
                // Keep alive / Ping if needed
            }
            else {
                console.error("Invalid websocket connection object", Object.keys(connection || {}));
            }
        });
    });
    fastify.addHook('onClose', async () => {
        await queue_1.redisSubscriber.quit();
    });
};
exports.setupWebsocket = setupWebsocket;
