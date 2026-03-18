import { create } from "zustand";
import Decimal from "decimal.js";
import { getCodexClient } from "@/lib/codex";
import { useWalletStore } from "@/stores/use-wallet-store";

interface BalanceParams {
  tokenAddress: string;
  tokenDecimals: number;
  nativeDecimals: number;
  networkId: number;
}

const ZERO = new Decimal(0);

interface BalanceState {
  nativeBalance: number;
  nativeAtomicBalance: Decimal;
  tokenBalance: number;
  tokenAtomicBalance: Decimal;
  loading: boolean;
  _params: BalanceParams | null;
  fetchBalance: (params: BalanceParams) => Promise<void>;
  refreshBalance: () => Promise<void>;
  reset: () => void;
}

const initialBalances = {
  nativeBalance: 0,
  nativeAtomicBalance: ZERO,
  tokenBalance: 0,
  tokenAtomicBalance: ZERO,
};

export const useBalanceStore = create<BalanceState>((set, get) => ({
  ...initialBalances,
  loading: true,
  _params: null,

  fetchBalance: async (params) => {
    const publicKey = useWalletStore.getState().publicKey;
    if (!publicKey) return;

    set({ loading: true, _params: params });

    try {
      const codex = getCodexClient();
      const res = await codex.queries.balances({
        input: {
          networks: [params.networkId],
          walletAddress: publicKey,
          includeNative: true,
        },
      });

      const items = res?.balances?.items ?? [];

      const nativeItem = items.find(
        (i) => i.tokenId === `native:${params.networkId}`
      );
      const tokenItem = items.find(
        (i) => i.tokenId === `${params.tokenAddress}:${params.networkId}`
      );

      const nativeAtomic = nativeItem ? new Decimal(nativeItem.balance) : ZERO;
      const tokenAtomic = tokenItem ? new Decimal(tokenItem.balance) : ZERO;

      set({
        nativeBalance: nativeAtomic
          .div(10 ** params.nativeDecimals)
          .toNumber(),
        nativeAtomicBalance: nativeAtomic,
        tokenBalance: tokenAtomic
          .div(10 ** params.tokenDecimals)
          .toNumber(),
        tokenAtomicBalance: tokenAtomic,
        loading: false,
      });
    } catch (err) {
      console.error("Error fetching balances:", err);
      set({ loading: false });
    }
  },

  refreshBalance: async () => {
    const params = get()._params;
    if (params) await get().fetchBalance(params);
  },

  reset: () => set({ ...initialBalances, loading: true, _params: null }),
}));
