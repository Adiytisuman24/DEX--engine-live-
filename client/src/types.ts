export interface Order {
  orderId: string;
  tokenIn: string;
  tokenOut: string;
  amount: number;
  slippage: number;
  status: 'pending' | 'queued' | 'routing' | 'route_selected' | 'building' | 'submitted' | 'confirmed' | 'failed';
  selectedDex?: string;
  executedPrice?: number;
  txHash?: string;
  walletAddress?: string;
  errorReason?: string;
  timestamp?: number;
  createdAt?: string;

  // New fields for extended state
  queuePosition?: number;
  retryAttempt?: number;
  maxRetries?: number;
  completedAt?: number; // Timestamp when order reached confirmed/failed
}

export interface OrderMetadata {
    tokenIn: string;
    tokenOut: string;
    amount: number;
    executedPrice?: number;
    executed_price?: number;
    errorReason?: string;
    queuePosition?: number;
}

export interface Token {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
}

export type ExecutionStep =
  | "pending"
  | "queued"
  | "routing"
  | "route_selected"
  | "building"
  | "submitted"
  | "confirmed"
  | "failed";


