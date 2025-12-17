import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({ host: 'localhost', port: 6379, maxRetriesPerRequest: null });

export const orderQueue = new Queue('order-execution', { connection });

export const ORDERS_CHANNEL = 'order_updates';
export const redisPublisher = new IORedis({ host: 'localhost', port: 6379 });

export const closeQueueRedis = async () => {
    await orderQueue.close();
    await connection.quit();
    await redisPublisher.quit();
};
