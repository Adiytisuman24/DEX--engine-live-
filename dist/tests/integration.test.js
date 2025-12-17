"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("../queue");
const db_1 = require("../db");
const worker_1 = require("../engine/worker");
describe('Integration Tests', () => {
    let worker;
    beforeAll(async () => {
        await (0, db_1.initDb)();
        await db_1.pool.query('DELETE FROM orders');
        await queue_1.orderQueue.drain();
        worker = (0, worker_1.startWorker)();
    });
    afterAll(async () => {
        await worker.close();
        await db_1.pool.end();
        await (0, queue_1.closeQueueRedis)();
    });
    test('Full Order Lifecycle', async () => {
        const orderId = '00000000-0000-0000-0000-000000000001';
        // Manual insert into DB as API does
        await db_1.pool.query(`INSERT INTO orders (id, token_in, token_out, amount, slippage, status) VALUES ($1, $2, $3, $4, $5, 'pending')`, [orderId, 'SOL', 'USDC', 1.0, 0.01]);
        // Enqueue
        const job = await queue_1.orderQueue.add('execute-swap', {
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
            const res = await db_1.pool.query('SELECT status, executed_price, tx_hash FROM orders WHERE id = $1', [orderId]);
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
