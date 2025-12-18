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

    const EXECUTION_MODE = process.env.EXECUTION_MODE || 'mock';
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log(`  ⚡ DEX Execution Engine`);
    console.log(`  Mode: ${EXECUTION_MODE.toUpperCase()}`);
    console.log('═══════════════════════════════════════');
    console.log('');

    fastify.get('/', async () => {
        return { status: 'ok', message: 'DEX Order Execution Engine is running 🚀' };
    });

    // Debug endpoint to check internal state on Render
    fastify.get('/api/debug', async () => {
        try {
            const orderCountRes = await pool.query('SELECT COUNT(*) FROM orders');
            const orderCount = orderCountRes.rows[0].count;
            return { 
                status: 'alive',
                pid: process.pid,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                executionMode: process.env.EXECUTION_MODE || 'mock',
                orderCount: parseInt(orderCount),
                workerActive: !!(global as any).worker_alive,
                lastHeartbeat: (global as any).last_heartbeat,
                env: {
                    render: !!process.env.RENDER,
                    node_env: process.env.NODE_ENV
                }
            };
        } catch (e: any) {
            return { status: 'degraded', error: e.message, pid: process.pid };
        }
    });

    fastify.get('/api/orders', async () => {
        const res = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
        // map db snake_case to camelCase
        return res.rows.map((row: any) => ({
            orderId: row.id,
            status: row.status,
            tokenIn: row.token_in,
            tokenOut: row.token_out,
            amount: parseFloat(row.amount),
            slippage: parseFloat(row.slippage),
            selectedDex: row.selected_dex,
            executedPrice: row.executed_price != null ? parseFloat(String(row.executed_price)) : undefined,
            txHash: row.tx_hash,
            errorReason: row.error_reason,
            createdAt: row.created_at,
            completedAt: row.completed_at || row.updated_at
        }));
    });

    // Wallet Verification Endpoint
    fastify.post('/api/verify-wallet', async (request, reply) => {
        const { walletAddress, apiKey } = request.body as any;

        if (!walletAddress) {
            return reply.status(400).send({ error: 'Wallet address is required' });
        }

        try {
            // Validate wallet address format (basic check)
            if (walletAddress.length < 32 || walletAddress.length > 44) {
                return reply.status(400).send({ error: 'Invalid wallet address format' });
            }

            // Import Connection and PublicKey for Solana
            const { Connection, PublicKey } = await import('@solana/web3.js');

            // Determine RPC URL (use API key if provided)
            // Using internal Helius API key as per user request
            const rpcUrl = `https://devnet.helius-rpc.com/?api-key=a4705aae-14c8-4ac6-b373-2f77d7223aaf`;
            const connection = new Connection(rpcUrl, 'confirmed');
            const publicKey = new PublicKey(walletAddress);

            // Get balance
            const balance = await connection.getBalance(publicKey);
            const balanceInSol = balance / 1e9; // Convert lamports to SOL

            // Mock network congestion analysis for slippage recommendation
            const recommendedSlippage = balanceInSol > 10 ? 0.005 : 0.015; // 0.5% or 1.5% based on wallet "tier" for demo

            console.log(`✅ Wallet verified: ${walletAddress} | Balance: ${balanceInSol} SOL | Recommended Slippage: ${recommendedSlippage * 100}%`);

            return {
                success: true,
                walletAddress,
                balance: balanceInSol,
                recommendedSlippage,
                network: process.env.SOLANA_CLUSTER || 'devnet'
            };

        } catch (error: any) {
            console.error('Wallet verification failed:', error);
            return reply.status(400).send({
                error: 'Failed to verify wallet',
                details: error.message
            });
        }
    });


    fastify.post('/api/orders/execute', async (request, reply) => {
        const { tokenIn, tokenOut, amount, slippage, walletAddress, executionMode } = request.body as any;
        
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
        console.log(`[API-MOCK] 🟢 ENQUEUING: ${orderId} (PID: ${process.pid}, BusID: ${(global as any).__MOCK_BUS__?.listenerCount('mock-job')})`);
        
        await orderQueue.add('execute-swap', { orderId, tokenIn, tokenOut, amount, slippage, walletAddress, executionMode }, {
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
