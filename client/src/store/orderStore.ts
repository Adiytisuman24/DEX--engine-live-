import { create } from 'zustand';
import type { Order } from '../types';

interface OrderStore {
  orders: Record<string, Order>;
  activeOrderId: string | undefined;
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  setActiveOrderId: (id: string | undefined) => void;
}

export const useOrderStore = create<OrderStore>((set) => ({
  orders: {},
  activeOrderId: undefined,
  setOrders: (ordersList) => {
      const ordersMap = ordersList.reduce((acc, order) => {
          acc[order.orderId] = order;
          return acc;
      }, {} as Record<string, Order>);
      set({ orders: ordersMap });
  },
  addOrder: (order) => set((state) => ({
      orders: { ...state.orders, [order.orderId]: order }
  })),
  updateOrder: (id, patch) => set((state) => {
      const existing = state.orders[id];
      if (!existing) return state; // or handle if we want to upsert, but typically update is for existing
      return {
        orders: {
            ...state.orders,
            [id]: { ...existing, ...patch }
        }
      };
  }),
  setActiveOrderId: (id) => set({ activeOrderId: id })
}));
