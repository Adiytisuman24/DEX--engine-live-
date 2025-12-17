"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisPublisher = exports.ORDERS_CHANNEL = exports.orderQueue = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const connection = new ioredis_1.default({ host: 'localhost', port: 6379, maxRetriesPerRequest: null });
exports.orderQueue = new bullmq_1.Queue('order-execution', { connection });
exports.ORDERS_CHANNEL = 'order_updates';
exports.redisPublisher = new ioredis_1.default({ host: 'localhost', port: 6379 });
