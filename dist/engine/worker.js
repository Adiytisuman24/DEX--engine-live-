"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorker = void 0;
const bullmq_1 = require("bullmq");
const router_1 = require("../dex/router");
const db_1 = require("../db");
const queue_1 = require("../queue");
const ioredis_1 = __importDefault(require("ioredis"));
const connection = new ioredis_1.default({ host: 'localhost', port: 6379, maxRetriesPerRequest: null });
const router = new router_1.DexRouter();
async function updateOrder(id, updates) {
    // DB Update
    const fields = Object.keys(updates).map((k, i) => {
        // map camelCase to snake_case for DB
        const dbKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        return `${dbKey} = $${i + 2}`;
    });
    if (fields.length > 0) {
        await db_1.pool.query(`UPDATE orders SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $1`, [id, ...Object.values(updates)]);
    }
    // Publish event
    if (updates.status) {
        queue_1.redisPublisher.publish(queue_1.ORDERS_CHANNEL, JSON.stringify({
            orderId: id,
            status: updates.status,
            metadata: updates
        }));
    }
}
const startWorker = () => {
    console.log('Starting Execution Worker...');
    const worker = new bullmq_1.Worker('order-execution', async (job) => {
        const { orderId, tokenIn, tokenOut, amount } = job.data;
        console.log(`Processing order ${orderId}`);
        try {
            // 2. Routing
            await updateOrder(orderId, { status: 'routing' });
            const [raydium, meteora] = await Promise.all([
                router.getQuote('Raydium'),
                router.getQuote('Meteora')
            ]);
            console.log(`[ROUTER] Raydium: ${raydium.effectivePrice.toFixed(2)} | Meteora: ${meteora.effectivePrice.toFixed(2)}`);
            const bestQuote = raydium.effectivePrice > meteora.effectivePrice ? raydium : meteora;
            console.log(`Selected: ${bestQuote.dex}`);
            await updateOrder(orderId, { selectedDex: bestQuote.dex });
            // 3. Building
            await updateOrder(orderId, { status: 'building' });
            await new Promise(r => setTimeout(r, 500)); // Mock building time (blockhash etc)
            // 4. Submitted
            await updateOrder(orderId, { status: 'submitted' });
            await new Promise(r => setTimeout(r, 1000)); // Mock network confirmation
            // 5. Confirmed
            const txHash = '0x' + Math.random().toString(36).substring(7);
            await updateOrder(orderId, {
                status: 'confirmed',
                executedPrice: bestQuote.price,
                txHash
            });
            console.log(`Order ${orderId} CONFIRMED: ${txHash}`);
        }
        catch (e) {
            console.error(`Order ${orderId} failed:`, e);
            await updateOrder(orderId, { status: 'failed', errorReason: e.message });
            throw e; // triggers BullMQ retry
        }
    }, {
        connection,
        concurrency: 10,
        limiter: {
            max: 100,
            duration: 60000
        }
    });
    worker.on('failed', (job, err) => {
        if (job)
            console.error(`Job ${job.id} failed with ${err.message}`);
    });
    return worker;
};
exports.startWorker = startWorker;
