
// =================================================================================
// 🔧 CONFIGURATION
// =================================================================================

// 1. PASTE YOUR RENDER BACKEND URL HERE (e.g., 'https://molecule-backend-xyz.onrender.com')
export const RENDER_BACKEND_URL: string = ''; 

// =================================================================================

const isProd = import.meta.env.PROD;

// Determine API URL
export const API_URL = (() => {
    // 1. Prefer Environment Variable (Vercel)
    if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')) {
        return import.meta.env.VITE_API_URL;
    }
    
    if (isProd) {
        if (!RENDER_BACKEND_URL) {
            console.error('🚨 PRODUCTION ERROR: RENDER_BACKEND_URL is not set in src/config.ts');
            return 'https://dex-engine-live.onrender.com/';
        }
        const url = RENDER_BACKEND_URL;
        return url.replace(/\/$/, '');
    }
    
    // 3. Local Development
    return 'http://localhost:3000';
})();

// Determine WebSocket URL
export const WS_URL = (() => {
    // 1. Prefer Environment Variable (Vercel)
    if (import.meta.env.VITE_WS_URL) {
        return import.meta.env.VITE_WS_URL;
    }

    // 2. Derive from API_URL
    const protocol = API_URL.startsWith('https') ? 'wss://' : 'ws://';
    const host = API_URL.replace(/^https?:\/\//, '');
    return `${protocol}${host}/ws`;
})();

console.log(`[Config] Mode: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} | API: ${API_URL}`);
