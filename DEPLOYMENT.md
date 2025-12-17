# DEX Execution Engine

⚡ **Live Demo**: [Your Vercel URL]
📖 **Documentation**: See [README.md](./README.md) and [DEVNET_SETUP.md](./DEVNET_SETUP.md)

## Project Architecture

This is a full-stack DEX order execution engine with:
- **Backend**: Node.js + TypeScript API server (`src/`)
- **Frontend**: React + Vite SPA (`client/`)

## Deployment

### Frontend (Vercel)
The frontend is deployed to Vercel as a static SPA.
- **Build Dir**: `client/`
- **Output**: `client/dist`
- **Framework**: Vite + React

### Backend (Separate Server)
The backend requires a Node.js runtime and should be deployed separately:
- Railway.app
- Render.com
- Fly.io
- Or any Node.js hosting

**Important**: Update `API_URL` and `WS_URL` in `client/src/App.tsx` to point to your deployed backend.

## Local Development

```bash
# Terminal 1 - Backend
npm install
npm run dev

# Terminal 2 - Frontend
cd client
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
```env
EXECUTION_MODE=mock
POSTGRES_USER=admin
POSTGRES_PASSWORD=password
POSTGRES_DB=dex_engine
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
```

### Frontend (client/.env)
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/ws
```

## Production Checklist

- [ ] Deploy backend to Railway/Render
- [ ] Update frontend API URLs
- [ ] Configure CORS on backend for production domain
- [ ] Set up PostgreSQL and Redis instances
- [ ] Configure environment variables
- [ ] Test WebSocket connection

## Tech Stack

**Frontend**:
- React 18
- TypeScript
- Vite
- Zustand (state)
- Framer Motion (animations)

**Backend**:
- Node.js + TypeScript
- Fastify (API)
- BullMQ (job queue)
- PostgreSQL (persistence)
- Redis (pub/sub)
- WebSocket (real-time)

**Blockchain**:
- Solana Web3.js
- Raydium SDK
- CoinGecko API
