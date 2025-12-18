import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { EventEmitter } from 'events';

const EXECUTION_MODE = process.env.EXECUTION_MODE || 'mock';

// --- MOCK IMPLEMENTATION ---
class MockRedis extends EventEmitter {
    constructor() { super(); }
    publish(channel: string, message: string) {
        this.emit('message', channel, message);
        // Global broadcast for other mock instances (singleton behavior simulation)
        globalMockRedis.emit('message', channel, message);
    }
    subscribe(channel: string) { 
        // In-memory, we just listen to the global emitter
        globalMockRedis.on('message', (ch: string, msg: string) => {
            if (ch === channel) this.emit('message', ch, msg);
        });
    }
    quit() { return Promise.resolve(); }
}
// Use global scope to share the emitter across module instances in the same process
const globalMockRedis = (global as any).mockRedis || new EventEmitter();
if (!(global as any).mockRedis) {
    (global as any).mockRedis = globalMockRedis;
    // Set a high limit to prevent warnings during complex simulations
    globalMockRedis.setMaxListeners(100);
}

class MockQueue {
    name: string;
    constructor(name: string) { this.name = name; }
    async add(name: string, data: any, opts?: any) {
        console.log(`[MockQueue] 🟢 EMITTING JOB: ${name} for order ${data.orderId}`);
        // Use a slight delay to ensure listeners are ready in all environments
        setTimeout(() => {
            globalMockRedis.emit('mock-job', { name, data, opts });
        }, 100);
        return { id: 'mock-' + Date.now() };
    }
    async close() { }
    async drain() { }
}
// ---------------------------

export const createRedisClient = () => {
    if (EXECUTION_MODE === 'mock') {
        return new MockRedis() as any;
    }
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    return new IORedis(redisUrl, { maxRetriesPerRequest: null });
};

// Singleton connections
const connection = createRedisClient();

export const orderQueue = (EXECUTION_MODE === 'mock') 
    ? new MockQueue('order-execution') as any
    : new Queue('order-execution', { connection });

export const ORDERS_CHANNEL = 'order_updates';
export const redisPublisher = createRedisClient();

// Shared subscriber for websocket/worker use
export const redisSubscriber = createRedisClient();

export const closeQueueRedis = async () => {
    if (orderQueue.close) await orderQueue.close();
    if (connection.quit) await connection.quit();
    if (redisPublisher.quit) await redisPublisher.quit();
    if (redisSubscriber.quit) await redisSubscriber.quit();
};

// Helper for the worker to listen for mock jobs
export const listenForMockJobs = (handler: (job: any) => Promise<void>) => {
    if (EXECUTION_MODE === 'mock') {
        console.log('[Worker] 👂 Listening for Mock Jobs...');
        globalMockRedis.on('mock-job', async (payload: { name: string; data: any; opts?: any }) => {
            console.log(`[Worker] 📥 RECEIVED JOB: ${payload.name} for order ${payload.data.orderId}`);
            try {
                // Simulate Job object
                const job = { 
                    id: 'mock-' + Date.now(),
                    name: payload.name, 
                    data: payload.data,
                    updateProgress: () => {} 
                };
                await handler(job);
            } catch (err) {
                console.error('[Worker] ❌ Mock job failed', err);
            }
        });
    }
};

