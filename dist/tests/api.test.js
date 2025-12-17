"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../api/server");
const db_1 = require("../db");
const queue_1 = require("../queue");
describe('API Tests', () => {
    beforeAll(async () => {
        await (0, db_1.initDb)();
        await db_1.pool.query('DELETE FROM orders');
        await queue_1.orderQueue.drain();
        await server_1.app.ready();
    });
    afterAll(async () => {
        await server_1.app.close();
        await db_1.pool.end();
        await queue_1.orderQueue.close();
    });
    test('POST /api/orders/execute should create order', async () => {
        const response = await server_1.app.inject({
            method: 'POST',
            url: '/api/orders/execute',
            payload: {
                tokenIn: 'SOL',
                tokenOut: 'USDC',
                amount: 1.5,
                slippage: 0.01
            }
        });
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.orderId).toBeDefined();
        // Verify DB
        const res = await db_1.pool.query('SELECT * FROM orders WHERE id = $1', [body.orderId]);
        expect(res.rows.length).toBe(1);
        expect(res.rows[0].status).toBe('pending');
    });
    test('POST /api/orders/execute should fail with missing fields', async () => {
        const response = await server_1.app.inject({
            method: 'POST',
            url: '/api/orders/execute',
            payload: {
                tokenIn: 'SOL'
                // missing others
            }
        });
        expect(response.statusCode).toBe(400);
    });
});
