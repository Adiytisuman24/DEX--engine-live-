import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { orderQueue, redisPublisher, ORDERS_CHANNEL } from '../queue';
import { pool, initDb } from '../db';
import { v4 as uuidv4 } from 'uuid';
import IORedis from 'ioredis';

import cors from '@fastify/cors';
import { setupWebsocket } from '../websocket/manager';

const buildApp = () => {
    const fastify = Fastify({ logger: true });
    fastify.register(cors, { 
        origin: true, // Allow all origins for demo
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    });
    fastify.register(websocket);

    setupWebsocket(fastify);

    fastify.get('/', async () => {
        return { status: 'ok', message: 'DEX Order Execution Engine is running 🚀' };
    });

    fastify.get('/api/orders', async () => {
        const res = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
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
        const { tokenIn, tokenOut, amount, slippage, walletAddress } = request.body as any;
        
        // Validation
        if (!tokenIn || !tokenOut || !amount || !slippage || !walletAddress) {
            console.error('Validation failed:', { tokenIn, tokenOut, amount, slippage, walletAddress });
            return reply.status(400).send({ error: 'Missing fields' });
        }

        const orderId = uuidv4();
        
        // Persist
        await pool.query(
            `INSERT INTO orders (id, token_in, token_out, amount, slippage, wallet_address, status) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
            [orderId, tokenIn, tokenOut, amount, slippage, walletAddress]
        );

        // Queue
        await orderQueue.add('execute-swap', { orderId, tokenIn, tokenOut, amount, slippage, walletAddress }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 }
        });
        
        // Emit pending
        redisPublisher.publish(ORDERS_CHANNEL, JSON.stringify({
            orderId,
            status: 'pending',
            metadata: { tokenIn, tokenOut, amount, walletAddress }
        }));

        return { orderId };
    });
    
    return fastify;
}

export const app = buildApp();

export const startServer = async () => {
    await initDb();
    const port = 3000; // Force 3000
    try {
        await app.listen({ port, host: '0.0.0.0' });
        console.log(`SERVER_READY: Listening on http://localhost:${port}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

