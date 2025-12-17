import { app } from '../api/server';
import { pool, initDb } from '../db';
import { orderQueue, closeQueueRedis } from '../queue';

describe('API Tests', () => {
    beforeAll(async () => {
        await initDb();
        await pool.query('DELETE FROM orders');
        await orderQueue.drain();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
        await pool.end();
        await closeQueueRedis();
    });

    test('POST /api/orders/execute should create order', async () => {
        const response = await app.inject({
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
        const res = await pool.query('SELECT * FROM orders WHERE id = $1', [body.orderId]);
        expect(res.rows.length).toBe(1);
        expect(res.rows[0].status).toBe('pending');
    });

    test('POST /api/orders/execute should fail with missing fields', async () => {
        const response = await app.inject({
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
