import { create } from 'zustand';
import type { Order } from '../types';

export type ExecutionStatus =
  | "pending"
  | "queued"
  | "routing"
  | "route_selected"
  | "building"
  | "submitted"
  | "confirmed"
  | "failed";

export type ExecutionEvent = {
  orderId: string;
  status: ExecutionStatus;
  timestamp: number;
  
  // Optional fields based on status
  retryAttempt?: number;
  maxRetries?: number;
  dex?: "RAYDIUM" | "METEORA";
  executedPrice?: number;
  error?: string;
  queuePosition?: number;
  txHash?: string;
  
  // Legacy/Metadata bag if needed, but prefer typed fields
  metadata?: any;
};

interface ExecutionStore {
  // Timeline events: source of truth for replay/history
  executions: Record<string, ExecutionEvent[]>;
  
  // Active state snapshot: source of truth for Table/Panels
  activeOrders: Record<string, Order>;

  // Actions
  applyEvent: (event: ExecutionEvent) => void;
  initializeOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
}

export const useExecutionStore = create<ExecutionStore>((set) => ({
  executions: {},
  activeOrders: {},

  initializeOrders: (orders) => 
    set(() => ({
        activeOrders: orders.reduce((acc, order) => {
            acc[order.orderId] = order;
            return acc;
        }, {} as Record<string, Order>)
    })),

  addOrder: (order) => 
    set((state) => ({
        activeOrders: { ...state.activeOrders, [order.orderId]: order },
        executions: { ...state.executions, [order.orderId]: [] }
    })),

  applyEvent: (event) => 
    set((state) => {
        const previousEvents = state.executions[event.orderId] || [];
        const newEvents = [...previousEvents, event];
        
        const existingOrder = state.activeOrders[event.orderId];
        
        // Strict: if order not known, we can't update snapshot.
        // In real app, might want to fetch or upsert partial.
        if (!existingOrder) {
             return {
                 executions: { ...state.executions, [event.orderId]: newEvents }
             };
        }

        const updatedOrder: Order = {
            ...existingOrder,
            status: event.status as any,
            
            // Map specific fields
            executedPrice: event.executedPrice ?? existingOrder.executedPrice,
            errorReason: event.error ?? existingOrder.errorReason,
            selectedDex: event.dex ?? existingOrder.selectedDex,
            txHash: event.txHash ?? existingOrder.txHash,
            
            // Queue & Retry info
            queuePosition: event.queuePosition ?? existingOrder.queuePosition,
            retryAttempt: event.retryAttempt ?? existingOrder.retryAttempt,
            maxRetries: event.maxRetries ?? existingOrder.maxRetries,
            completedAt: ['confirmed', 'failed'].includes(event.status) ? Date.now() : existingOrder.completedAt
        };

        return {
            executions: { ...state.executions, [event.orderId]: newEvents },
            activeOrders: { ...state.activeOrders, [event.orderId]: updatedOrder }
        };
    })
}));
