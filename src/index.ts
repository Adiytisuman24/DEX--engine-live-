import { startServer } from './api/server';
import { startWorker } from './engine/worker';

const main = async () => {
    console.log('🚀 Initializing DEX Order Execution Engine...');
    
    // Start Worker
    startWorker();
    
    // Start API Server
    await startServer();
    
    console.log('✨ Engine and API are fully operational.');
};

main().catch(err => {
    console.error(err);
    process.exit(1);
});
