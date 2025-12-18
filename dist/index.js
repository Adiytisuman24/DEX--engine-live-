"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./api/server");
const worker_1 = require("./engine/worker");
const main = async () => {
    console.log('🚀 Initializing DEX Order Execution Engine...');
    // Start Worker
    (0, worker_1.startWorker)();
    // Start API Server
    await (0, server_1.startServer)();
    console.log('✨ Engine and API are fully operational.');
};
main().catch(err => {
    console.error(err);
    process.exit(1);
});
