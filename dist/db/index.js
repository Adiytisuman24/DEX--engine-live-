"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.pool = (process.env.EXECUTION_MODE === 'mock')
    ? new (class MockPool {
        constructor() {
            this.orders = [];
        }
        async query(text, params = []) {
            const t = text.trim().toUpperCase();
            if (t.startsWith('INSERT INTO ORDERS')) {
                // Very basic parse: assumes params match INSERT standard used in app
                // INSERT INTO orders (id, token_in...) VALUES ($1, $2...)
                // We know the index logic from the app usage:
                // [orderId, tokenIn, tokenOut, amount, slippage, walletAddress]
                // We need to map params to object.
                // Since this is a specific mock for this app, we can cheat slightly or be robust.
                // Let's look at the specific INSERT used in server.ts
                const order = {
                    id: params[0],
                    token_in: params[1],
                    token_out: params[2],
                    amount: params[3],
                    slippage: params[4],
                    wallet_address: params[5],
                    status: 'pending',
                    created_at: new Date(),
                    updated_at: new Date()
                };
                this.orders.push(order);
                return { rows: [order], rowCount: 1 };
            }
            if (t.startsWith('SELECT * FROM ORDERS')) {
                // ORDER BY created_at DESC LIMIT 50
                const sorted = [...this.orders].sort((a, b) => b.created_at - a.created_at).slice(0, 50);
                return { rows: sorted, rowCount: sorted.length };
            }
            if (t.startsWith('UPDATE ORDERS SET')) {
                // UPDATE orders SET status = $2..., updated_at = NOW() WHERE id = $1
                // Helper logic in worker.ts constructs dynamic queries.
                // We need to extract ID. Usually it is the first param in WHERE clause, but worker.ts puts it as $1 and values follow?
                // Actually worker.ts: "WHERE id = $1", [id, ...values]
                const id = params[0];
                const order = this.orders.find(o => o.id === id);
                if (order) {
                    // We need to parse which fields are being updated.
                    // The query string looks like "status = $2, executed_price = $3 ..."
                    // This is hard to parse generically.
                    // However, we can infer from params.
                    // worker.ts: keys mapped to $i+2. id is $1.
                    // So params[1] corresponds to first field in SQL... wait.
                    // Worker: `[id, ...Object.values(updates)]`
                    // Query: `UPDATE ... SET field1=$2, field2=$3 ... WHERE id=$1`
                    // We need to match the order of fields in the text to the params.
                    // Regex to find "column_name = $N"
                    const matches = text.match(/([a-z_]+)\s*=\s*\$(\d+)/g);
                    if (matches) {
                        matches.forEach(m => {
                            const parts = m.split('=');
                            const col = parts[0].trim();
                            const idx = parseInt(parts[1].trim().replace('$', '')) - 1; // 0-indexed
                            if (idx < params.length && col !== 'id') {
                                order[col] = params[idx];
                            }
                        });
                    }
                    order.updated_at = new Date();
                }
                return { rows: [], rowCount: 1 };
            }
            if (t.startsWith('CREATE TABLE') || t.startsWith('DO $$')) {
                return { rows: [], rowCount: 0 };
            }
            return { rows: [], rowCount: 0 };
        }
    })()
    : new pg_1.Pool({
        user: process.env.POSTGRES_USER || 'admin',
        password: process.env.POSTGRES_PASSWORD || 'password',
        host: process.env.POSTGRES_HOST || 'localhost',
        database: process.env.POSTGRES_DB || 'dex_engine',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        ssl: process.env.POSTGRES_SSL ? { rejectUnauthorized: false } : undefined
    });
const initDb = async () => {
    // Wait for DB to be ready loop
    let retries = 5;
    while (retries > 0) {
        try {
            await exports.pool.query(`
                CREATE TABLE IF NOT EXISTS orders (
                    id UUID PRIMARY KEY,
                    token_in VARCHAR(10) NOT NULL,
                    token_out VARCHAR(10) NOT NULL,
                    wallet_address VARCHAR(100),
                    amount DECIMAL NOT NULL,
                    slippage DECIMAL NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    selected_dex VARCHAR(20),
                    executed_price DECIMAL,
                    tx_hash VARCHAR(100),
                    error_reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                -- Attempt to add column if it doesn't exist (migration hack for dev)
                DO $$ 
                BEGIN 
                    BEGIN
                        ALTER TABLE orders ADD COLUMN wallet_address VARCHAR(100);
                    EXCEPTION
                        WHEN duplicate_column THEN RAISE NOTICE 'column wallet_address already exists in orders.';
                    END;
                    
                    BEGIN
                        ALTER TABLE orders ADD COLUMN timestamp BIGINT; -- Stores execution duration in ms
                    EXCEPTION
                        WHEN duplicate_column THEN RAISE NOTICE 'column timestamp already exists in orders.';
                    END;
                END $$;
            `);
            console.log('DB Initialized');
            break;
        }
        catch (err) {
            console.error('DB Init failed, retrying...', err);
            retries--;
            await new Promise(res => setTimeout(res, 2000));
        }
    }
};
exports.initDb = initDb;
