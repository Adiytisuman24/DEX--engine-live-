export type OrderStatus = 'pending' | 'routing' | 'building' | 'submitted' | 'confirmed' | 'failed';

export interface Order {
  id: string;
  tokenIn: string;
  tokenOut: string;
  amount: number;
  slippage: number;
  status: OrderStatus;
  selectedDex?: 'Raydium' | 'Meteora';
  executedPrice?: number;
  txHash?: string;
  errorReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Quote {
  dex: 'Raydium' | 'Meteora';
  price: number;
  fee: number;
  effectivePrice: number;
}
