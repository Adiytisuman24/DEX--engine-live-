"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DexRouter = void 0;
const SIM_LATENCY_MIN = 200;
const SIM_LATENCY_MAX = 300;
class DexRouter {
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getRandomPrice(base, variancePercent) {
        const variance = base * (variancePercent / 100);
        const sign = Math.random() > 0.5 ? 1 : -1;
        return base + (Math.random() * variance * sign);
    }
    async getQuote(dex) {
        const latency = Math.floor(Math.random() * (SIM_LATENCY_MAX - SIM_LATENCY_MIN + 1)) + SIM_LATENCY_MIN;
        await this.sleep(latency);
        // Mock base price for SOL/USDC approx 150
        const basePrice = 150;
        const price = this.getRandomPrice(basePrice, 5); // 2-5% variance
        const fee = dex === 'Raydium' ? 0.003 : 0.005; // 0.3% vs 0.5% mock
        return {
            dex,
            price,
            fee,
            effectivePrice: price * (1 - fee)
        };
    }
}
exports.DexRouter = DexRouter;
