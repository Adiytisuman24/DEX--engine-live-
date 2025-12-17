"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
    // Wallet Verification Endpoint
    fastify.post('/api/verify-wallet', async (request, reply) => {
        const { walletAddress, apiKey } = request.body;
        if (!walletAddress) {
            return reply.status(400).send({ error: 'Wallet address is required' });
        }
        try {
            // Validate wallet address format (basic check)
            if (walletAddress.length < 32 || walletAddress.length > 44) {
                return reply.status(400).send({ error: 'Invalid wallet address format' });
            }
            // Import Connection and PublicKey for Solana
            const { Connection, PublicKey } = await Promise.resolve().then(() => __importStar(require('@solana/web3.js')));
            // Determine RPC URL (use API key if provided)
            let rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
            if (apiKey) {
                // For Helius: wss://mainnet.helius-rpc.com/?api-key=YOUR_KEY
                // For QuickNode: https://YOUR_ENDPOINT.quiknode.pro/YOUR_TOKEN/
                // We'll assume the apiKey is a full RPC URL
                if (apiKey.startsWith('http')) {
                    rpcUrl = apiKey;
                }
            }
            const connection = new Connection(rpcUrl, 'confirmed');
            const publicKey = new PublicKey(walletAddress);
            // Get balance
            const balance = await connection.getBalance(publicKey);
            const balanceInSol = balance / 1e9; // Convert lamports to SOL
            console.log(`✅ Wallet verified: ${walletAddress} | Balance: ${balanceInSol} SOL`);
            return {
                success: true,
                walletAddress,
                balance: balanceInSol,
                network: process.env.SOLANA_CLUSTER || 'devnet'
            };
        }
        catch (error) {
            console.error('Wallet verification failed:', error);
            return reply.status(400).send({
                error: 'Failed to verify wallet',
                details: error.message
            });
        }
    });
    fastify.post('/api/orders/execute', async (request, reply) => {
        const { tokenIn, tokenOut, amount, slippage, walletAddress, executionMode } = request.body;
        // Validation
        if (!tokenIn || !tokenOut || !amount || !slippage || !walletAddress) {
            console.error('Validation failed:', { tokenIn, tokenOut, amount, slippage, walletAddress });
            return reply.status(400).send({ error: 'Missing fields' });
        }
        const orderId = (0, uuid_1.v4)();
        // Persist
        await db_1.pool.query(`INSERT INTO orders (id, token_in, token_out, amount, slippage, wallet_address, status) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`, [orderId, tokenIn, tokenOut, amount, slippage, walletAddress]);
        // Queue
        await queue_1.orderQueue.add('execute-swap', { orderId, tokenIn, tokenOut, amount, slippage, walletAddress, executionMode }, {
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
