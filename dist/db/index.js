"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.pool = new pg_1.Pool({
    user: process.env.POSTGRES_USER || 'admin',
    password: process.env.POSTGRES_PASSWORD || 'password',
    host: 'localhost',
    database: process.env.POSTGRES_DB || 'dex_engine',
    port: 5432,
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
