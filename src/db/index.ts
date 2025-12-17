import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool({
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'password',
  host: 'localhost',
  database: process.env.POSTGRES_DB || 'dex_engine',
  port: 5432,
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
        } catch (err) {
            console.error('DB Init failed, retrying...', err);
            retries--;
            await new Promise(res => setTimeout(res, 2000));
        }
    }
};
