import { create } from "zustand";
import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";

interface WalletState {
  keypair: Keypair | null;
  connection: Connection | null;
  publicKey: string | null;
  isReady: boolean;
  error: string | null;
  initialize: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  keypair: null,
  connection: null,
  publicKey: null,
  isReady: false,
  error: null,

  initialize: () => {
    if (get().isReady || get().error) return;

    const privateKey = import.meta.env.VITE_SOLANA_PRIVATE_KEY;
    const rpcUrl = import.meta.env.VITE_HELIUS_RPC_URL;

    if (!privateKey || !rpcUrl) {
      set({
        error: "Missing VITE_SOLANA_PRIVATE_KEY or VITE_HELIUS_RPC_URL",
        isReady: false,
      });
      return;
    }

    try {
      const secretKey = bs58.decode(privateKey);
      const keypair = Keypair.fromSecretKey(secretKey);
      const connection = new Connection(rpcUrl);

      set({
        keypair,
        connection,
        publicKey: keypair.publicKey.toBase58(),
        isReady: true,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to initialize wallet",
        isReady: false,
      });
    }
  },
}));
