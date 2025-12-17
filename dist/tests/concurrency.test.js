"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("../queue");
const db_1 = require("../db");
const worker_1 = require("../engine/worker");
const uuid_1 = require("uuid");
describe('Concurrency Tests', () => {
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
    test('Should process 5 orders concurrently', async () => {
        const orderIds = [];
        for (let i = 0; i < 5; i++) {
            const id = (0, uuid_1.v4)();
            orderIds.push(id);
            await db_1.pool.query(`INSERT INTO orders (id, token_in, token_out, amount, slippage, status) VALUES ($1, $2, $3, $4, $5, 'pending')`, [id, 'SOL', 'USDC', 1.0, 0.01]);
            await queue_1.orderQueue.add('execute-swap', {
                orderId: id, tokenIn: 'SOL', tokenOut: 'USDC', amount: 1.0
            });
        }
        // Wait up to 15s
        const startTime = Date.now();
        while (Date.now() - startTime < 15000) {
            const res = await db_1.pool.query('SELECT COUNT(*) as count FROM orders WHERE status = \'confirmed\'');
            if (parseInt(res.rows[0].count) === 5) {
                break;
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        const res = await db_1.pool.query('SELECT COUNT(*) as count FROM orders WHERE status = \'confirmed\'');
        expect(parseInt(res.rows[0].count)).toBe(5);
    }, 20000);
});
