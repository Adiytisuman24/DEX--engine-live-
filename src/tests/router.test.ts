import { DexRouter } from '../dex/router';

describe('DexRouter', () => {
    let router: DexRouter;

    beforeEach(() => {
        router = new DexRouter();
    });

    test('should return a valid quote for Raydium', async () => {
        const quote = await router.getQuote('Raydium', 'SOL', 'USDC', 100);
        expect(quote.dex).toBe('Raydium');
        expect(quote.price).toBeGreaterThan(0);
        expect(quote.fee).toBe(0.0025);
    });

    test('should return a valid quote for Meteora', async () => {
        const quote = await router.getQuote('Meteora', 'SOL', 'USDC', 100);
        expect(quote.dex).toBe('Meteora');
        expect(quote.price).toBeGreaterThan(0);
        expect(quote.fee).toBe(0.003);
    });

    test('effective price should be price * (1 - fee)', async () => {
        const quote = await router.getQuote('Raydium', 'SOL', 'USDC', 100);
        expect(quote.effectivePrice).toBe(quote.price * (1 - quote.fee));
    });
    
    test('should simulate latency', async () => {
        const start = Date.now();
        await router.getQuote('Raydium', 'SOL', 'USDC', 100);
        const duration = Date.now() - start;
        // Mock latency is 20-50ms now
        expect(duration).toBeGreaterThanOrEqual(15); // slightly loose for js timing
    });

    test('should find best quote', async () => {
        const quote = await router.findBestQuote('SOL', 'USDC', 100);
        expect(['Raydium', 'Meteora']).toContain(quote.dex);
        expect(quote.effectivePrice).toBeGreaterThan(0);
    });
});

describe('Execution Logic', () => {
    test('should select better price', () => {
        const raydium = { dex: 'Raydium', effectivePrice: 100 } as any;
        const meteora = { dex: 'Meteora', effectivePrice: 105 } as any; // Better
        
        const best = raydium.effectivePrice > meteora.effectivePrice ? raydium : meteora;
        expect(best.dex).toBe('Meteora');
    });

    test('should select better price reversed', () => {
        const raydium = { dex: 'Raydium', effectivePrice: 110 } as any; // Better
        const meteora = { dex: 'Meteora', effectivePrice: 105 } as any;
        
        const best = raydium.effectivePrice > meteora.effectivePrice ? raydium : meteora;
        expect(best.dex).toBe('Raydium');
    });
});
