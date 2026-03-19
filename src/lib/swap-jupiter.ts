import { VersionedTransaction } from "@solana/web3.js";
import type { SwapProvider, SwapParams, SwapResult } from "./swap-provider";
import Jupiter from "./jupiter";

export class JupiterSwapProvider implements SwapProvider {
  readonly type = "jupiter" as const;

  async createTransaction(params: SwapParams): Promise<SwapResult> {
    const { inputMint, outputMint, amount, signer } = params;

    const data = await Jupiter.getOrder({
      inputMint,
      outputMint,
      amount,
      signer,
    });

    if (data.error) {
      throw new Error(data.error);
    }
    if (!data.transaction) {
      throw new Error("No transaction returned from Jupiter");
    }

    const transaction = VersionedTransaction.deserialize(
      Buffer.from(data.transaction, "base64"),
    );

    return {
      transaction,
      inputAmount: data.inAmount,
      expectedOutputAmount: data.outAmount,
      priceImpactPct: parseFloat(data.priceImpactPct),
    };
  }
}
