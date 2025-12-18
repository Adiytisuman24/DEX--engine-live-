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

  // Visual simulation state
  activeSimulationId: string | null;
  simulatedStep: ExecutionStatus | null;

  // Actions
  applyEvent: (event: ExecutionEvent) => void;
  initializeOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  startSimulation: (orderId: string, timeline: readonly { step: string, at: number }[]) => void;
  stopSimulation: () => void;
}

export const useExecutionStore = create<ExecutionStore>((set) => ({
  executions: {},
  activeOrders: {},
  activeSimulationId: null,
  simulatedStep: null,

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

  startSimulation: (orderId, timeline) => {
    set({ activeSimulationId: orderId, simulatedStep: 'pending' });
    
    // Clear old timers if any (though usually managed by stopSimulation)
    timeline.forEach((item) => {
        setTimeout(() => {
            set((state) => {
                // Only update if we're still simulating this specific order
                if (state.activeSimulationId === orderId) {
                    return { simulatedStep: item.step as ExecutionStatus };
                }
                return {};
            });
        }, item.at);
    });
  },

  stopSimulation: () => set({ activeSimulationId: null, simulatedStep: null }),

  applyEvent: (event) => 
    set((state) => {
        const previousEvents = state.executions[event.orderId] || [];
        const newEvents = [...previousEvents, event];
        
        const existingOrder = state.activeOrders[event.orderId];
        
        if (!existingOrder) {
             return {
                 executions: { ...state.executions, [event.orderId]: newEvents }
             };
        }

        // If this event is 'confirmed' or 'failed', we should stop any simulation for it
        const isTerminal = ['confirmed', 'failed'].includes(event.status);
        const simUpdate = (isTerminal && state.activeSimulationId === event.orderId) 
            ? { activeSimulationId: null, simulatedStep: null } 
            : {};

        const updatedOrder: Order = {
            ...existingOrder,
            status: event.status as any,
            executedPrice: event.executedPrice ?? existingOrder.executedPrice,
            errorReason: event.error ?? existingOrder.errorReason,
            selectedDex: event.dex ?? existingOrder.selectedDex,
            txHash: event.txHash ?? existingOrder.txHash,
            queuePosition: event.queuePosition ?? existingOrder.queuePosition,
            retryAttempt: event.retryAttempt ?? existingOrder.retryAttempt,
            maxRetries: event.maxRetries ?? existingOrder.maxRetries,
            completedAt: isTerminal ? Date.now() : existingOrder.completedAt
        };

        return {
            executions: { ...state.executions, [event.orderId]: newEvents },
            activeOrders: { ...state.activeOrders, [event.orderId]: updatedOrder },
            ...simUpdate
        };
    })
}));
