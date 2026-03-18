import { memo, useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EnhancedToken } from "@codex-data/sdk/dist/sdk/generated/graphql";
import { useTrade } from "@/hooks/use-trade";
import { useWalletStore } from "@/stores/use-wallet-store";
import { useBalanceStore } from "@/stores/use-balance-store";
import { signTransaction, sendTransaction, confirmTransaction } from "@/lib/solana";

interface InstantTradeFormProps {
  token: EnhancedToken;
}

const SOL_PRESETS = [0.001, 0.01, 0.1, 1] as const;
const SELL_PRESETS = [10, 25, 50, 100] as const;

export const InstantTradeForm = memo(function InstantTradeForm({
  token,
}: InstantTradeFormProps) {
  const tokenSymbol = token.symbol;
  const [executing, setExecuting] = useState(false);
  const executingRef = useRef(false);

  const keypair = useWalletStore((s) => s.keypair);
  const connection = useWalletStore((s) => s.connection);
  const publicKey = useWalletStore((s) => s.publicKey);
  const walletError = useWalletStore((s) => s.error);

  const solBalance = useBalanceStore((s) => s.nativeBalance);
  const tokenBalance = useBalanceStore((s) => s.tokenBalance);
  const tokenAtomicBalance = useBalanceStore((s) => s.tokenAtomicBalance);
  const refreshBalance = useBalanceStore((s) => s.refreshBalance);

  const { createTransaction } = useTrade(token.address, tokenAtomicBalance);

  const executeTrade = useCallback(
    async (direction: "buy" | "sell", value: number) => {
      if (!keypair || !connection || executingRef.current) return;
      executingRef.current = true;
      setExecuting(true);

      const label =
        direction === "buy" ? `Buy ${value} SOL` : `Sell ${value}%`;
      const toastId = toast.loading(`${label} — submitting...`);

      try {
        const transaction = await createTransaction({
          direction,
          value,
          signer: keypair.publicKey,
        });

        toast.loading(`${label} — signing...`, { id: toastId });
        const signed = signTransaction(keypair, transaction);

        toast.loading(`${label} — sending...`, { id: toastId });
        const signature = await sendTransaction(signed, connection);

        toast.loading(`${label} — confirming...`, { id: toastId });
        const confirmation = await confirmTransaction(signature, connection);

        if (confirmation.value.err) {
          throw new Error("Transaction failed on-chain");
        }

        toast.success(`${label} — success! TX: ${signature.slice(0, 8)}...`, {
          id: toastId,
        });
        setTimeout(refreshBalance, 1000);
      } catch (error) {
        toast.error((error as Error).message, { id: toastId });
      } finally {
        executingRef.current = false;
        setExecuting(false);
      }
    },
    [keypair, connection, createTransaction, refreshBalance]
  );

  if (walletError || !keypair) {
    return (
      <div className="text-sm text-muted-foreground">
        {walletError ||
          "Wallet not configured. Set VITE_SOLANA_PRIVATE_KEY and VITE_HELIUS_RPC_URL."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Wallet address */}
      <button
        onClick={() => {
          if (publicKey) navigator.clipboard.writeText(publicKey);
          toast.success("Address copied!");
        }}
        className="text-xs text-muted-foreground font-mono hover:text-foreground transition-colors block ml-auto"
      >
        {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
      </button>

      {/* ── Buy Section ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-foreground">Buy</span>
          <span className="text-xs text-muted-foreground">
            {solBalance.toFixed(4)} SOL
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {SOL_PRESETS.map((amt) => (
            <button
              key={amt}
              disabled={executing}
              onClick={() => executeTrade("buy", amt)}
              className={cn(
                "py-2 rounded-lg text-sm font-semibold transition-all",
                "bg-muted/40 text-green-400 hover:bg-muted/60",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              {amt}
            </button>
          ))}
        </div>
      </div>

      {/* ── OR Divider ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">OR</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── Sell Section ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-foreground">Sell</span>
          <span className="text-xs text-muted-foreground">
            {tokenBalance.toLocaleString()} {tokenSymbol}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {SELL_PRESETS.map((pct) => (
            <button
              key={pct}
              disabled={executing || tokenBalance <= 0}
              onClick={() => executeTrade("sell", pct)}
              className={cn(
                "py-2 rounded-lg text-sm font-semibold transition-all",
                "bg-muted/40 text-pink-400 hover:bg-muted/60",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
