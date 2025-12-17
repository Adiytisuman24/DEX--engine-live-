import { Worker, Job } from 'bullmq';
import { DexRouter } from '../dex/router';
import { pool } from '../db';
import { redisPublisher, ORDERS_CHANNEL } from '../queue';
import { Order } from '../types';
import IORedis from 'ioredis';

const connection = new IORedis({ host: 'localhost', port: 6379, maxRetriesPerRequest: null });
const router = new DexRouter();

async function updateOrder(id: string, updates: Partial<Order>) {
    // DB Update
    const fields = Object.keys(updates).map((k, i) => {
        // map camelCase to snake_case for DB
        const dbKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        return `${dbKey} = $${i + 2}`;
    });
    
    if (fields.length > 0) {
        await pool.query(`UPDATE orders SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $1`, [id, ...Object.values(updates)]);
    }

    // Publish event
    redisPublisher.publish(ORDERS_CHANNEL, JSON.stringify({
        orderId: id,
        status: updates.status, // might be undefined, which is fine
        metadata: updates
    }));
}

export const startWorker = () => {
    console.log('Starting Execution Worker...');
    const worker = new Worker('order-execution', async (job: Job) => {
        const { orderId, tokenIn, tokenOut, amount } = job.data;
        console.log(`Processing order ${orderId}`);

        const startTime = Date.now();
        try {
            // ⏳ GLOBAL DEADLINE GUARD (10s Budget)
            const ORDER_DEADLINE = 10000;

            // 1️⃣ PENDING (Already set on enqueue, but re-confirm)
            // await updateOrder(orderId, { status: 'pending' }); // Optional since API does it

            // 2️⃣ ROUTING (Allocated: ~1-2s)
            await updateOrder(orderId, { status: 'routing' });
            
            // Parallel: Route calculation + min delay for visibility
            const routingTask = router.findBestQuote(tokenIn, tokenOut, amount); 
            const routingDelay = new Promise(r => setTimeout(r, 1000));
            
            // Wait for both
            const [bestQuote] = await Promise.all([routingTask, routingDelay]); 

            console.log(`[ROUTER] Selected Best Quote: ${bestQuote.dex} @ ${bestQuote.effectivePrice.toFixed(6)}`);

            // 3️⃣ ROUTE SELECTED (Allocated: ~1s)
            await updateOrder(orderId, { 
                status: 'route_selected',
                selectedDex: bestQuote.dex,
                executedPrice: bestQuote.price
            });
            await new Promise(r => setTimeout(r, 1000));

            // 4️⃣ BUILDING (Allocated: ~1s)
            await updateOrder(orderId, { status: 'building' });
            
            // Pure computation simulation
            const txData = `${orderId}-${Date.now()}-${amount}`;
            let hash = 5381;
            for (let i = 0; i < txData.length; i++) hash = ((hash << 5) + hash) + txData.charCodeAt(i);
            const txHash = '0x' + (hash >>> 0).toString(16).padStart(64, '0');
            
            await new Promise(r => setTimeout(r, 1000));

            // 5️⃣ SUBMITTED (Allocated: ~1s)
            await updateOrder(orderId, { 
                status: 'submitted',
                txHash: txHash
            });
            await new Promise(r => setTimeout(r, 1000));

            // 6️⃣ CONFIRMED (Allocated: ~2-3s settlement)
            // Guard: don't confirm if we are already over budget? 
            // Actually, we should confirm if possible, but let's check remaining time.
            const remaining = ORDER_DEADLINE - (Date.now() - startTime);
            if (remaining < 0) {
                 // In strict mode, maybe fail? But for UX, better to complete late than fail late.
                 // We'll log a warning.
                 console.warn(`Order ${orderId} exceeded SLA budget.`);
            }

            // Simulate network settlement (2s)
            await new Promise(r => setTimeout(r, 2000));

            const duration = Date.now() - startTime;
            
            await updateOrder(orderId, { 
                status: 'confirmed', 
                executedPrice: bestQuote.price,
                txHash,
                timestamp: duration
            });
            console.log(`Order ${orderId} CONFIRMED: ${txHash} in ${duration}ms`);

        } catch (e: any) {
            console.error(`Order ${orderId} failed:`, e);
            await updateOrder(orderId, { status: 'failed', errorReason: e.message });
            throw e; // triggers BullMQ retry
        }

    }, { 
        connection, 
        concurrency: 50,
        limiter: {
            max: 500,
            duration: 60000 
        }
    });

    worker.on('failed', (job, err) => {
        if (job)
            console.error(`Job ${job.id} failed with ${err.message}`);
    });
    
    return worker;
};
