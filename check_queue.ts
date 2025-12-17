import { orderQueue } from './src/queue';
import { startWorker } from './src/engine/worker';

async function check() {
    console.log('Checking Queue Status...');
    const counts = await orderQueue.getJobCounts();
    console.log('Job Counts:', counts);
    
    // Check if worker is processing
    // We can't easily check the worker instance from here unless we start a new one or inspect redis.
    process.exit(0);
}

check();
