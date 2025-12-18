import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = (process.env.EXECUTION_MODE === 'mock') 
? new (class MockPool {
    orders: any[] = [];
    async query(text: string, params: any[] = []) {
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
                const newOrder: any = { status: 'pending', created_at: new Date(), updated_at: new Date() };
                
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
                if (!newOrder.wallet_address) newOrder.wallet_address = 'mock-wallet';

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
                results.sort((a,b) => b.created_at - a.created_at);
            }
            // Handle LIMIT
            if (t.includes('LIMIT')) {
                results = results.slice(0, 50);
            }

                // Ensure numeric types for DB fields often treated as strings
                results = results.map(row => {
                    const mappedRow = { ...row };
                    if (mappedRow.executed_price !== undefined) mappedRow.executed_price = Number(mappedRow.executed_price);
                    if (mappedRow.amount !== undefined) mappedRow.amount = Number(mappedRow.amount);
                    if (mappedRow.slippage !== undefined) mappedRow.slippage = Number(mappedRow.slippage);
                    
                    if (!t.includes('*')) {
                        const selectPart = text.substring(6, text.toUpperCase().indexOf('FROM')).trim();
                        const fields = selectPart.split(',').map(f => f.trim().split(' ')[0].replace(/[^a-z0-9_]/gi, ''));
                        const filteredRow: any = {};
                        fields.forEach(f => { if (mappedRow[f] !== undefined) filteredRow[f] = mappedRow[f]; });
                        return filteredRow;
                    }
                    return mappedRow;
                });

            return { rows: results, rowCount: results.length };
        }

        if (t.startsWith('UPDATE ORDERS SET')) {
            // UPDATE orders SET status = $2..., updated_at = NOW() WHERE id = $1
            const idMatch = text.match(/id\s*=\s*\$1/i);
            const id = params[0];
            const order = this.orders.find(o => o.id === id);
            
            if (order) {
                // Robust mapping using regex for both column name and $ selection
                const matches = text.match(/([a-zA-Z0-9_]+)\s*=\s*\$(\d+)/g);
                if (matches) {
                    const updates: any = {};
                    matches.forEach(m => {
                        const parts = m.split('=');
                        const col = parts[0].trim().toLowerCase();
                        const paramIdx = parseInt(parts[1].trim().replace('$', '')) - 1;
                        if (paramIdx < params.length && col !== 'id') {
                             order[col] = params[paramIdx];
                             updates[col] = params[paramIdx];
                        }
                    });
                    // Publish event (assuming redisPublisher and ORDERS_CHANNEL are defined elsewhere in the actual app)
                    // This part of the mock is just simulating the update logic, not the actual publishing.
                    // If this were a real mock, redisPublisher would also be mocked.
                    // For now, we'll just ensure the data is updated.
                    // redisPublisher.publish(ORDERS_CHANNEL, JSON.stringify({
                    //     orderId: id,
                    //     status: updates.status, 
                    //     executedPrice: updates.executed_price, // Elevate price to top level
                    //     metadata: updates
                    // }));
                }
                order.updated_at = new Date();
                // If status is 'completed', set completed_at
                if (order.status === 'completed' && !order.completed_at) {
                    order.completed_at = new Date();
                }
            }
            return { rows: [], rowCount: 1 };
        }
        
        // Default fallthrough
        return { rows: [], rowCount: 0 };
    }
    async end() { return; }
})() as any
: new Pool({
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'password',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'dex_engine',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  ssl: process.env.POSTGRES_SSL ? { rejectUnauthorized: false } : undefined
});

export const initDb = async () => {
    // Wait for DB to be ready loop
    let retries = 5;
    while (retries > 0) {
        try {
            await pool.query(`
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
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP
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
        } catch (err) {
            console.error('DB Init failed, retrying...', err);
            retries--;
            await new Promise(res => setTimeout(res, 2000));
        }
    }
};
