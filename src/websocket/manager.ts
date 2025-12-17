import { FastifyInstance } from 'fastify';
import IORedis from 'ioredis';
import { ORDERS_CHANNEL } from '../queue';

export const setupWebsocket = (fastify: FastifyInstance) => {
    const redisSubscriber = new IORedis({ host: 'localhost', port: 6379 });
    redisSubscriber.subscribe(ORDERS_CHANNEL);

    // Map of websocket connections
    const clients = new Set<any>();

    redisSubscriber.on('message', (channel, message) => {
        if (channel === ORDERS_CHANNEL) {
            for (const client of clients) {
                if (client.readyState === 1) { // 1 = OPEN
                    client.send(message);
                }
            }
        }
    });

    fastify.register(async function (fastify) {
      fastify.get('/ws', { websocket: true }, (connection, req) => {
        const socket = connection.socket || connection as any; 
        console.log('Client connected to WebSocket. Socket available:', !!socket);
        
        if (socket && (socket.on || socket.addEventListener)) {
            clients.add(socket);
            socket.on('close', () => clients.delete(socket));
            // Keep alive / Ping if needed
        } else {
             console.error("Invalid websocket connection object", Object.keys(connection || {}));
        }
      });
    });

    fastify.addHook('onClose', async () => {
        await redisSubscriber.quit();
    });
};
