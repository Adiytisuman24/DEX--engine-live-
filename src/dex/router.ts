import { Quote } from '../types';

declare global {
  var solPriceCache: number | undefined;
  var solPriceCacheTimestamp: number;
}

// Simulate fast RPC calls
const SIM_LATENCY_MIN = 20;
const SIM_LATENCY_MAX = 50;

declare global {
    var priceCache: Record<string, { price: number; timestamp: number }> | undefined;
}

export class DexRouter {
  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper to normalize tokens (e.g. handle SOL -> wrapped SOL)
  private getTokenId(token: string): string {
      const map: Record<string, string> = {
          'SOL': 'solana',
          'USDC': 'usd-coin',
          'DOGE': 'dogecoin',
          'BTC': 'bitcoin',
          'ETH': 'ethereum',
          'RAY': 'raydium',
      };
      return map[token.toUpperCase()] || 'solana'; // Fallback to SOL
  }

  private getRandomPrice(base: number, variancePercent: number): number {
    const variance = base * (variancePercent / 100);
    const sign = Math.random() > 0.5 ? 1 : -1;
    return base + (Math.random() * variance * sign);
  }

    // Fetches real price from CoinGecko API with 30s cache
    private async getPrice(tokenIn: string, tokenOut: string): Promise<number> {
        const idIn = this.getTokenId(tokenIn);
        const idOut = this.getTokenId(tokenOut);
        
        // Simple mock for "SOL/USDC" -> roughly 150.
        // But if asking generic pair...
        // Let's rely on cached or fresh coingecko.
        
        const cacheKey = `${idIn}-${idOut}`;
        if (!global.priceCache) global.priceCache = {};
        
        if (global.priceCache[cacheKey] && Date.now() - global.priceCache[cacheKey].timestamp < 30000) {
            return global.priceCache[cacheKey].price;
        }

        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 3000);
            // Get prices for both in USD
            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${idIn},${idOut}&vs_currencies=usd`, { signal: controller.signal });
            clearTimeout(id);
            if (res.ok) {
                const data = await res.json() as any;
                const pIn = data[idIn]?.usd || 1;
                const pOut = data[idOut]?.usd || 1;
                const rate = pIn / pOut;
                
                global.priceCache[cacheKey] = { price: rate, timestamp: Date.now() };
                console.log(`[ORACLE] Fetched Rate ${tokenIn}/${tokenOut}: ${rate}`);
                return rate;
            }
        } catch (e) {
            console.error('Failed to fetch prices, using fallback', e);
        }
        
        // Fallback Logic
        if (tokenIn === 'SOL' && tokenOut === 'USDC') return 150;
        if (tokenIn === 'DOGE' && tokenOut === 'SOL') return 0.001; // rough guess
        return 1.0; 
    }

    async getQuote(dex: 'Raydium' | 'Meteora', tokenIn: string, tokenOut: string, amount: number): Promise<Quote> {
        const latency = Math.floor(Math.random() * (SIM_LATENCY_MAX - SIM_LATENCY_MIN + 1)) + SIM_LATENCY_MIN;
        await this.sleep(latency);

        // Get Real Rate
        const rate = await this.getPrice(tokenIn, tokenOut);
        
        // Output amount = Input * Rate
        // Price displayed is usually Rate (price per token)
        
        const basePrice = rate;
        
        // Simulate price impact
        const impact = (amount / 1000) * 0.001;
        const rawPrice = this.getRandomPrice(basePrice, 0.02);
        
        const price = rawPrice * (1 - impact);

        const fee = dex === 'Raydium' ? 0.0025 : 0.003; 

        return {
          dex,
          price, // This is the RATE
          fee,
          effectivePrice: price * (1 - fee) 
        };
  }

  async findBestQuote(tokenIn: string, tokenOut: string, amount: number): Promise<Quote> {
    const quotes = await Promise.all([
      this.getQuote('Raydium', tokenIn, tokenOut, amount),
      this.getQuote('Meteora', tokenIn, tokenOut, amount)
    ]);

    return quotes.sort((a, b) => b.effectivePrice - a.effectivePrice)[0];
  }
}
