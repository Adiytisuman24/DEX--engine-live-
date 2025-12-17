import { startServer } from './api/server';
import { startWorker } from './engine/worker';

const main = async () => {
    // Start Worker
    startWorker();
    
    // Start API Server
    await startServer();
};

main().catch(err => {
    console.error(err);
    process.exit(1);
});
