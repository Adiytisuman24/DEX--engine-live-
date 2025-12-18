# DEX Order Execution Engine (Mock)
## DEX Order Execution Engine

This project implements a real-time market order execution engine with:
- Smart DEX routing (Raydium & Meteora)
- BullMQ-based concurrency & retries
- WebSocket lifecycle streaming
- Mock & Solana Devnet execution modes
- Timeline replay & observability

### Why Market Orders?
Market orders allow immediate execution, making them ideal for demonstrating
routing decisions, retries, and real-time WebSocket updates.

### Extending to Limit & Sniper Orders
The engine can be extended by swapping the routing trigger:
- Limit: price condition watcher
- Sniper: event-based trigger (token launch)

### Execution Lifecycle
pending → routing → route_selected → building → submitted → confirmed



A robust, production-grade Node.js + TypeScript order execution engine for executing market orders on Solana DEXes (Raydium/Meteora). Built with a focus on concurrency, reliability, and real-time observability.

## 🚀 Key Features

*   **Market Order Execution**: Simulated execution with smart routing between Raydium and Meteora throughout the lifecycle.
*   **Devnet Mode**: Intelligent network-aware execution with Helius/Solana Devnet integration.
*   **Wallet Verification**: Secure wallet audit showing balance and network connectivity status.
*   **Intelligent Slippage**: Automatically calculates and recommends slippage (0.5% - 2%) based on simulated network congestion.
*   **Smart Routing**: Selects the best effective price (Price - Fee) with simulated latency and slippage (2-5% variance).
*   **Queue-Based Processing**: Uses **BullMQ** + **Redis** for reliable, concurrent job processing (Up to 10 concurrent orders).
*   **Real-Time Updates**: **WebSocket** streams exact status changes (`pending` -> `routing` -> `building` -> `submitted` -> `confirmed`).
*   **Resiliency**: Database persistence (PostgreSQL) and exponential backoff retries for failed validations/executions.

## 🏗 Architecture

```mermaid
graph TD
    Client[Client / Postman] -->|HTTP POST| API[Fastify API]
    Client <-->|WebSocket| API
    API -->|Persist| DB[(PostgreSQL)]
    API -->|Enqueue Job| Queue[BullMQ / Redis]
    
    subgraph Execution Engine
        Worker[Worker Process] -->|Poll Job| Queue
        Worker -->|Fetch Quotes| Router[DEX Router (Mock)]
        Router -->|Raydium| Raydium[Raydium API]
        Router -->|Meteora| Meteora[Meteora API]
        Worker -->|Update Status| DB
        Worker -->|Publish Event| RedisPub[Redis Pub/Sub]
    end
    
    RedisPub -->|Subscribe| API
    API -->|Push Update| Client
```

## 🧠 Design Choices

**Why Market Orders?**
Market orders were chosen as the primary order type to demonstrate the critical aspects of an execution engine:
*   **Immediate Execution**: Allows showcasing the full lifecycle (Routing -> Submission -> Confirmation) in a concise demo.
*   **Latency Sensitivity**: Highlights the importance of the concurrent queue and low-latency architecture.
*   **Routing Logic**: perfect for demonstrating the price comparison logic between DEXes.

**Extensibility (Limit & Sniper Orders)**
The engine is designed to be pluggable. Limit and Sniper orders can be added by:
*   **Limit**: Adding a "Price Monitor" job that checks prices periodically and only enqueues the execution job when the target price is met.
*   **Sniper**: Listening to mempool/chain events and triggering the execution job on specific triggers (e.g. liquidity add).

## 🛠 Tech Stack

*   **Runtime**: Node.js + TypeScript
*   **Framework**: Fastify (High performance)
*   **Queue**: BullMQ (Redis-based)
*   **Database**: PostgreSQL (Persistence), Redis (Queue & Pub/Sub)
*   **Testing**: Jest (Integration & Unit)

## 📂 Project Structure

```bash
src/
 ├─ api/          # HTTP & WebSocket Server
 ├─ websocket/    # (Included in API for simplicity)
 ├─ queue/        # BullMQ setup & Redis connection
 ├─ dex/          # Router & Quote logic
 ├─ engine/       # Worker implementation
 ├─ db/           # Database connection & Schema
 ├─ tests/        # Jest full test suite
 └─ index.ts      # Entry point
```

## ⚙️ Setup & Run

### Prerequisites
*   Node.js v16+
*   Docker & Docker Compose

### 1. Installation
```bash
npm install
```

### 2. Start Infrastructure (Redis + Postgres)
```bash
docker-compose up -d
```

### 3. Build & Run
```bash
npm run build
npm start
```
The server will start at `http://localhost:3000`.

### 4. Running Tests
```bash
npm test
```

## 🌐 API Reference

### Execute Order
**POST** `/api/orders/execute`

**Body**:
```json
{
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amount": 1.5,
  "slippage": 0.01
}
```

**Response**:
```json
{
  "orderId": "uuid-string"
}
```

### WebSocket Stream
Connect to: `ws://localhost:3000/ws`

**Messages**:
```json
{
  "orderId": "uuid",
  "status": "routing",
  "metadata": { ... }
}
```

## 🔗 Links

*   **Deployment**: (https://dex-engine-demo.onrender.com)
*   **Demo Video**: (https://youtube.com/...](https://youtu.be/SgyjJpLL2YA?si=_MnaS7_9gIA3Drp-)



