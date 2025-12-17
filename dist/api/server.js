"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = exports.app = void 0;
const fastify_1 = __importDefault(require("fastify"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const queue_1 = require("../queue");
const db_1 = require("../db");
const uuid_1 = require("uuid");
const manager_1 = require("../websocket/manager");
const buildApp = () => {
    const fastify = (0, fastify_1.default)({ logger: true });
    fastify.register(websocket_1.default);
    (0, manager_1.setupWebsocket)(fastify);
    fastify.post('/api/orders/execute', async (request, reply) => {
        const { tokenIn, tokenOut, amount, slippage } = request.body;
        // Validation
        if (!tokenIn || !tokenOut || !amount || !slippage) {
            return reply.status(400).send({ error: 'Missing fields' });
        }
        const orderId = (0, uuid_1.v4)();
        // Persist
        await db_1.pool.query(`INSERT INTO orders (id, token_in, token_out, amount, slippage, status) VALUES ($1, $2, $3, $4, $5, 'pending')`, [orderId, tokenIn, tokenOut, amount, slippage]);
        // Queue
        await queue_1.orderQueue.add('execute-swap', { orderId, tokenIn, tokenOut, amount, slippage }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 }
        });
        // Emit pending
        queue_1.redisPublisher.publish(queue_1.ORDERS_CHANNEL, JSON.stringify({
            orderId,
            status: 'pending',
            metadata: { tokenIn, tokenOut, amount }
        }));
        return { orderId };
    });
    return fastify;
};
exports.app = buildApp();
const startServer = async () => {
    await (0, db_1.initDb)();
    try {
        await exports.app.listen({ port: 3000, host: '0.0.0.0' });
        console.log('Server running on http://localhost:3000');
    }
    catch (err) {
        exports.app.log.error(err);
        process.exit(1);
    }
};
exports.startServer = startServer;
