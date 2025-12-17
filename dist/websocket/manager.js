"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebsocket = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const queue_1 = require("../queue");
const setupWebsocket = (fastify) => {
    const redisSubscriber = new ioredis_1.default({ host: 'localhost', port: 6379 });
    redisSubscriber.subscribe(queue_1.ORDERS_CHANNEL);
    // Map of websocket connections
    const clients = new Set();
    redisSubscriber.on('message', (channel, message) => {
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
            console.log('Client connected to WebSocket');
            clients.add(connection.socket);
            connection.socket.on('close', () => clients.delete(connection.socket));
        });
    });
};
exports.setupWebsocket = setupWebsocket;
