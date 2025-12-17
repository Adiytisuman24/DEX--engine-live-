import { orderQueue, closeQueueRedis } from '../queue';
import { pool, initDb } from '../db';
import { startWorker } from '../engine/worker';
import { Worker } from 'bullmq';

describe('Integration Tests', () => {
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

    test('Full Order Lifecycle', async () => {
        const orderId = '00000000-0000-0000-0000-000000000001';
        
        // Manual insert into DB as API does
        await pool.query(
            `INSERT INTO orders (id, token_in, token_out, amount, slippage, status) VALUES ($1, $2, $3, $4, $5, 'pending')`,
            [orderId, 'SOL', 'USDC', 1.0, 0.01]
        );

        // Enqueue
        const job = await orderQueue.add('execute-swap', { 
            orderId, 
            tokenIn: 'SOL', 
            tokenOut: 'USDC', 
            amount: 1.0 
        });

        // Wait for completion and verify state transitions
        let confirmed = false;
        // The process takes ~2s (router 0.3s + build 0.5s + submit 1.0s = 1.8s)
        for (let i = 0; i < 20; i++) { 
            await new Promise(r => setTimeout(r, 500));
            const res = await pool.query('SELECT status, executed_price, tx_hash FROM orders WHERE id = $1', [orderId]);
            if (res.rows.length > 0) {
                const status = res.rows[0].status;
                if (status === 'confirmed') {
                     expect(parseFloat(res.rows[0].executed_price)).toBeGreaterThan(0);
                     expect(res.rows[0].tx_hash).toMatch(/^0x/);
                     confirmed = true;
                     break;
                }
                if (status === 'failed') {
                    throw new Error('Order failed unexpectedly');
                }
            }
        }
        expect(confirmed).toBe(true);
    }, 20000);
});
