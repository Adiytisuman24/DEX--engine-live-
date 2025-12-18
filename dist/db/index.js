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
            if (t.startsWith('DELETE FROM ORDERS')) {
                this.orders = [];
                return { rows: [], rowCount: 0 };
            }
            if (t.startsWith('INSERT INTO ORDERS')) {
                // Robust parsing logic to map VALUES to Columns
                // Pattern: INSERT INTO orders (col1, col2...) VALUES ($1, $2...)
                const colMatch = text.match(/\(([^)]+)\)\s+VALUES/i);
                if (colMatch) {
                    const cols = colMatch[1].split(',').map(c => c.trim().replace(/^"|"$/g, '')); // remove quotes if any
                    const newOrder = { status: 'pending', created_at: new Date(), updated_at: new Date() };
                    // Map params -> cols
                    // In PG, $1 maps to params[0]
                    // We need to match the values part... usually just $1, $2...
                    // But tests might use hardcoded values (e.g. 'pending').
                    // Let's assume standard parameterized queries for now as per codebase usage.
                    cols.forEach((col, idx) => {
                        if (idx < params.length && params[idx] !== undefined) {
                            newOrder[col] = params[idx];
                        }
                    });
                    // Special case for missing wallet_address in some tests -> default it
                    if (!newOrder.wallet_address)
                        newOrder.wallet_address = 'mock-wallet';
                    this.orders.push(newOrder);
                    return { rows: [newOrder], rowCount: 1 };
                }
            }
            if (t.startsWith('SELECT COUNT(*)')) {
                // SELECT COUNT(*) as count FROM orders WHERE status = 'confirmed'
                const statusMatch = text.match(/status = '([^']+)'/i);
                let count = this.orders.length;
                if (statusMatch) {
                    count = this.orders.filter(o => o.status === statusMatch[1]).length;
                }
                return { rows: [{ count: count.toString() }], rowCount: 1 };
            }
            if (t.startsWith('SELECT')) {
                // Handle WHERE id = $1
                let results = [...this.orders];
                const idMatch = text.match(/id = \$(\d+)/i);
                if (idMatch) {
                    const idx = parseInt(idMatch[1]) - 1;
                    if (idx < params.length) {
                        results = results.filter(o => o.id === params[idx]);
                    }
                }
                // Handle ORDER BY
                if (t.includes('ORDER BY')) {
                    results.sort((a, b) => b.created_at - a.created_at);
                }
                // Handle LIMIT
                if (t.includes('LIMIT')) {
                    results = results.slice(0, 50);
                }
                // Handle specific field selection? "SELECT status, executed_price..."
                if (!t.includes('*')) {
                    // simple parser for selected columns
                    const selectPart = text.substring(6, text.toUpperCase().indexOf('FROM')).trim();
                    const fields = selectPart.split(',').map(f => f.trim().split(' ')[0]); // ignore aliases
                    results = results.map(row => {
                        const newRow = {};
                        fields.forEach(f => {
                            const cleanF = f.replace(/[^a-z0-9_]/gi, '');
                            if (row[cleanF] !== undefined)
                                newRow[cleanF] = row[cleanF];
                        });
                        return newRow;
                    });
                }
                return { rows: results, rowCount: results.length };
            }
            if (t.startsWith('UPDATE ORDERS SET')) {
                // UPDATE orders SET status = $2..., updated_at = NOW() WHERE id = $1
                const idMatch = text.match(/id\s*=\s*\$1/i);
                const id = params[0];
                const order = this.orders.find(o => o.id === id);
                if (order) {
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
            // Default fallthrough
            return { rows: [], rowCount: 0 };
        }
        async end() { return; }
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
