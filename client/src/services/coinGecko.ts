import type { Token } from '../types';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const CACHE_KEY = 'coingecko_tokens';
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes

interface CacheData {
    timestamp: number;
    tokens: Token[];
}

export const fetchTopTokens = async (): Promise<Token[]> => {
    // Check cache
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            const { timestamp, tokens } = JSON.parse(cached) as CacheData;
            // Return cached if fresh
            if (Date.now() - timestamp < CACHE_DURATION) {
                return tokens;
            }
        } catch (e) {
            console.warn('Failed to parse cached tokens', e);
        }
    }

    try {
        // Fetch top 500 tokens (2 pages of 250)
        // Note: CoinGecko has a rate limit of ~10-30 calls/min for public API.
        // We do parallel requests, which might hit rate limits if refreshes happen often.
        const [page1, page2] = await Promise.all([
            fetch(`${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false`),
            fetch(`${COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=2&sparkline=false`)
        ]);

        if (!page1.ok || !page2.ok) {
             const errorText = !page1.ok ? await page1.text() : await page2.text();
             throw new Error(`Failed to fetch tokens: ${page1.status} ${page2.status} - ${errorText}`);
        }

        const data1 = await page1.json();
        const data2 = await page2.json();
        
interface CoinData {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
}

        const tokens: Token[] = [...data1, ...data2].map((coin: CoinData) => ({
            id: coin.id,
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            image: coin.image,
            current_price: coin.current_price
        }));

        // Update cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            tokens
        }));

        return tokens;
    } catch (error) {
        console.error('Error fetching tokens:', error);
        // Return cached data if available (even if expired) as fallback
        if (cached) {
             try {
                 const { tokens } = JSON.parse(cached) as CacheData;
                 return tokens;
             } catch { /* ignore */ }
        }
        // Fallback to a basic list if everything fails
        return [
            { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png', current_price: 0 },
            { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png', current_price: 0 },
            { id: 'solana', symbol: 'SOL', name: 'Solana', image: 'https://assets.coingecko.com/coins/images/4128/thumb/solana.png', current_price: 0 },
            { id: 'usd-coin', symbol: 'USDC', name: 'USDC', image: 'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png', current_price: 1 },
            { id: 'tether', symbol: 'USDT', name: 'Tether', image: 'https://assets.coingecko.com/coins/images/325/thumb/Tether.png', current_price: 1 },
        ];
    }
};
