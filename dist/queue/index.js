"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listenForMockJobs = exports.closeQueueRedis = exports.redisSubscriber = exports.redisPublisher = exports.ORDERS_CHANNEL = exports.orderQueue = exports.createRedisClient = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const events_1 = require("events");
const EXECUTION_MODE = process.env.EXECUTION_MODE || 'mock';
// --- MOCK IMPLEMENTATION ---
class MockRedis extends events_1.EventEmitter {
    constructor() { super(); }
    publish(channel, message) {
        this.emit('message', channel, message);
        // Global broadcast for other mock instances (singleton behavior simulation)
        globalMockRedis.emit('message', channel, message);
    }
    subscribe(channel) {
        // In-memory, we just listen to the global emitter
        globalMockRedis.on('message', (ch, msg) => {
            if (ch === channel)
                this.emit('message', ch, msg);
        });
    }
    quit() { return Promise.resolve(); }
}
// Truly global bus for mock singleton
const getGlobalBus = () => {
    const g = global;
    if (!g.__MOCK_BUS__) {
        g.__MOCK_BUS__ = new events_1.EventEmitter();
        g.__MOCK_BUS__.setMaxListeners(100);
    }
    return g.__MOCK_BUS__;
};
const globalMockRedis = getGlobalBus();
class MockQueue {
    constructor(name) { this.name = name; }
    async add(name, data, opts) {
        console.log(`[MockQueue] 🟢 EMITTING JOB: ${name} for order ${data.orderId} (PID: ${process.pid})`);
        // Use a slight delay to ensure listeners are ready
        setTimeout(() => {
            globalMockRedis.emit('mock-job', { name, data, opts });
        }, 100);
        return { id: 'mock-' + Date.now() };
    }
    async close() { }
    async drain() { }
}
// ---------------------------
const createRedisClient = () => {
    if (EXECUTION_MODE === 'mock') {
        return new MockRedis();
    }
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    return new ioredis_1.default(redisUrl, { maxRetriesPerRequest: null });
};
exports.createRedisClient = createRedisClient;
// Singleton connections
const connection = (0, exports.createRedisClient)();
exports.orderQueue = (EXECUTION_MODE === 'mock')
    ? new MockQueue('order-execution')
    : new bullmq_1.Queue('order-execution', { connection });
exports.ORDERS_CHANNEL = 'order_updates';
exports.redisPublisher = (0, exports.createRedisClient)();
// Shared subscriber for websocket/worker use
exports.redisSubscriber = (0, exports.createRedisClient)();
const closeQueueRedis = async () => {
    if (exports.orderQueue.close)
        await exports.orderQueue.close();
    if (connection.quit)
        await connection.quit();
    if (exports.redisPublisher.quit)
        await exports.redisPublisher.quit();
    if (exports.redisSubscriber.quit)
        await exports.redisSubscriber.quit();
};
exports.closeQueueRedis = closeQueueRedis;
// Helper for the worker to listen for mock jobs
const listenForMockJobs = (handler) => {
    if (EXECUTION_MODE === 'mock') {
        console.log('[Worker] 👂 Setting up Mock Job Listener...');
        globalMockRedis.on('mock-job', async (payload) => {
            console.log(`[Worker] 📥 RECEIVED JOB: ${payload.name} for order ${payload.data.orderId} (PID: ${process.pid})`);
            try {
                // Simulate Job object
                const job = {
                    id: 'mock-' + Date.now(),
                    name: payload.name,
                    data: payload.data,
                    updateProgress: () => { }
                };
                await handler(job);
            }
            catch (err) {
                console.error('[Worker] ❌ Mock job failed', err);
            }
        });
    }
};
exports.listenForMockJobs = listenForMockJobs;
