"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router_1 = require("../dex/router");
describe('DexRouter', () => {
    let router;
    beforeEach(() => {
        router = new router_1.DexRouter();
    });
    test('should return a valid quote for Raydium', async () => {
        const quote = await router.getQuote('Raydium');
        expect(quote.dex).toBe('Raydium');
        expect(quote.price).toBeGreaterThan(0);
        expect(quote.fee).toBe(0.003);
    });
    test('should return a valid quote for Meteora', async () => {
        const quote = await router.getQuote('Meteora');
        expect(quote.dex).toBe('Meteora');
        expect(quote.price).toBeGreaterThan(0);
        expect(quote.fee).toBe(0.005);
    });
    test('effective price should be price * (1 - fee)', async () => {
        const quote = await router.getQuote('Raydium');
        expect(quote.effectivePrice).toBe(quote.price * (1 - quote.fee));
    });
    test('should simulate latency', async () => {
        const start = Date.now();
        await router.getQuote('Raydium');
        const duration = Date.now() - start;
        // Mock latency is 200-300ms
        expect(duration).toBeGreaterThanOrEqual(190); // slightly loose for js timing
    });
});
describe('Execution Logic', () => {
    test('should select better price', () => {
        const raydium = { dex: 'Raydium', effectivePrice: 100 };
        const meteora = { dex: 'Meteora', effectivePrice: 105 }; // Better
        const best = raydium.effectivePrice > meteora.effectivePrice ? raydium : meteora;
        expect(best.dex).toBe('Meteora');
    });
    test('should select better price reversed', () => {
        const raydium = { dex: 'Raydium', effectivePrice: 110 }; // Better
        const meteora = { dex: 'Meteora', effectivePrice: 105 };
        const best = raydium.effectivePrice > meteora.effectivePrice ? raydium : meteora;
        expect(best.dex).toBe('Raydium');
    });
});
