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
const cors_1 = __importDefault(require("@fastify/cors"));
const manager_1 = require("../websocket/manager");
const buildApp = () => {
    const fastify = (0, fastify_1.default)({ logger: true });
    fastify.register(cors_1.default, {
        origin: true, // Allow all origins for demo
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    });
    fastify.register(websocket_1.default);
    (0, manager_1.setupWebsocket)(fastify);
    fastify.get('/', async () => {
        return { status: 'ok', message: 'DEX Order Execution Engine is running 🚀' };
    });
    fastify.get('/api/orders', async () => {
        const res = await db_1.pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
        // map db snake_case to camelCase
        return res.rows.map(row => ({
            orderId: row.id,
            status: row.status,
            tokenIn: row.token_in,
            tokenOut: row.token_out,
            amount: parseFloat(row.amount),
            slippage: parseFloat(row.slippage),
            selectedDex: row.selected_dex,
            executedPrice: row.executed_price ? parseFloat(row.executed_price) : undefined,
            txHash: row.tx_hash,
            errorReason: row.error_reason,
            createdAt: row.created_at
        }));
    });
    fastify.post('/api/orders/execute', async (request, reply) => {
        const { tokenIn, tokenOut, amount, slippage, walletAddress } = request.body;
        // Validation
        if (!tokenIn || !tokenOut || !amount || !slippage || !walletAddress) {
            console.error('Validation failed:', { tokenIn, tokenOut, amount, slippage, walletAddress });
            return reply.status(400).send({ error: 'Missing fields' });
        }
        const orderId = (0, uuid_1.v4)();
        // Persist
        await db_1.pool.query(`INSERT INTO orders (id, token_in, token_out, amount, slippage, wallet_address, status) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`, [orderId, tokenIn, tokenOut, amount, slippage, walletAddress]);
        // Queue
        await queue_1.orderQueue.add('execute-swap', { orderId, tokenIn, tokenOut, amount, slippage, walletAddress }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 }
        });
        // Emit pending
        queue_1.redisPublisher.publish(queue_1.ORDERS_CHANNEL, JSON.stringify({
            orderId,
            status: 'pending',
            metadata: { tokenIn, tokenOut, amount, walletAddress }
        }));
        return { orderId };
    });
    return fastify;
};
exports.app = buildApp();
const startServer = async () => {
    await (0, db_1.initDb)();
    const port = 3000; // Force 3000
    try {
        await exports.app.listen({ port, host: '0.0.0.0' });
        console.log(`SERVER_READY: Listening on http://localhost:${port}`);
    }
    catch (err) {
        exports.app.log.error(err);
        process.exit(1);
    }
};
exports.startServer = startServer;
