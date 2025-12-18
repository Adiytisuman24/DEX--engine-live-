import { create } from 'zustand';

export type ExecutionMode = 'mock' | 'devnet';

export interface DevnetConfig {
  walletAddress: string;
  apiKey: string;
  balance: number;
  verified: boolean;
  recommendedSlippage: number;
}

interface ModeStore {
  mode: ExecutionMode;
  devnetConfig: DevnetConfig | null;
  setMode: (mode: ExecutionMode) => void;
  setDevnetConfig: (config: DevnetConfig | null) => void;
  clearDevnetConfig: () => void;
}

export const useModeStore = create<ModeStore>((set) => ({
  mode: 'mock',
  devnetConfig: null,
  setMode: (mode) => set({ mode }),
  setDevnetConfig: (config) => set({ devnetConfig: config }),
  clearDevnetConfig: () => set({ devnetConfig: null, mode: 'mock' })
}));
