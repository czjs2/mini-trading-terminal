import { useCallback } from "react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import Decimal from "decimal.js";
import { bn } from "@/lib/utils";
import { SWAP_PROVIDER } from "@/lib/swap-provider";
import { getSwapProvider } from "@/lib/swap-providers";
import { useWalletStore } from "@/stores/use-wallet-store";

const provider = getSwapProvider(SWAP_PROVIDER);

export const useTrade = (
  tokenAddress: string,
  tokenAtomicBalance: Decimal,
) => {
  const connection = useWalletStore((s) => s.connection);

  const createTransaction = useCallback(
    async (params: {
      direction: "buy" | "sell";
      value: number;
      signer: PublicKey;
    }) => {
      if (!connection) throw new Error("Connection not ready");

      const { direction, value, signer } = params;

      const atomicAmount =
        direction === "buy"
          ? new Decimal(value).mul(LAMPORTS_PER_SOL)
          : tokenAtomicBalance.mul(value).div(100);

      const result = await provider.createTransaction({
        inputMint:
          direction === "buy" ? NATIVE_MINT : new PublicKey(tokenAddress),
        outputMint:
          direction === "buy" ? new PublicKey(tokenAddress) : NATIVE_MINT,
        amount: bn(atomicAmount),
        signer,
        connection,
      });

      return result.transaction;
    },
    [tokenAddress, tokenAtomicBalance, connection],
  );

  return { createTransaction };
};
