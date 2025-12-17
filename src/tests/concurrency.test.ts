import { orderQueue, closeQueueRedis } from '../queue';
import { pool, initDb } from '../db';
import { startWorker } from '../engine/worker';
import { Worker } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';

describe('Concurrency Tests', () => {
    let worker: Worker;

    beforeAll(async () => {
        await initDb();
        await pool.query('DELETE FROM orders');
        await orderQueue.drain();
        worker = startWorker();
    });

    afterAll(async () => {
        await worker.close();
        await pool.end();
        await closeQueueRedis();
    });

    test('Should process 5 orders concurrently', async () => {
        const orderIds: string[] = [];
        for (let i = 0; i < 5; i++) {
            const id = uuidv4();
            orderIds.push(id);
            await pool.query(
                `INSERT INTO orders (id, token_in, token_out, amount, slippage, status) VALUES ($1, $2, $3, $4, $5, 'pending')`,
                [id, 'SOL', 'USDC', 1.0, 0.01]
            );
            await orderQueue.add('execute-swap', { 
                orderId: id, tokenIn: 'SOL', tokenOut: 'USDC', amount: 1.0 
            });
        }

        // Wait up to 15s
        const startTime = Date.now();
        while (Date.now() - startTime < 15000) {
            const res = await pool.query('SELECT COUNT(*) as count FROM orders WHERE status = \'confirmed\'');
            if (parseInt(res.rows[0].count) === 5) {
                break;
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        const res = await pool.query('SELECT COUNT(*) as count FROM orders WHERE status = \'confirmed\'');
        expect(parseInt(res.rows[0].count)).toBe(5);
    }, 20000);
});
