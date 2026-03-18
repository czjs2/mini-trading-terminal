import { create } from "zustand";

const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 320;

interface TradePanelState {
  isOpen: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  toggle: () => void;
  open: () => void;
  close: () => void;
  setPosition: (pos: { x: number; y: number }) => void;
  setSize: (size: { width: number; height: number }) => void;
}

export const useTradePanelStore = create<TradePanelState>((set) => ({
  isOpen: false,
  position: {
    x: typeof window !== "undefined" ? Math.round((window.innerWidth - DEFAULT_WIDTH) / 2) : 0,
    y: typeof window !== "undefined" ? Math.round((window.innerHeight - DEFAULT_HEIGHT) / 2) : 0,
  },
  size: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setPosition: (position) => set({ position }),
  setSize: (size) => set({ size }),
}));
