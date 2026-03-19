import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import BN from "bn.js";

export type SwapProviderType = "jupiter" | "raydium";

export const SWAP_PROVIDER_LABELS: Record<SwapProviderType, string> = {
  jupiter: "Jupiter",
  raydium: "Raydium",
};

const VALID_PROVIDERS: Set<string> = new Set<string>(["jupiter", "raydium"]);

function resolveProvider(): SwapProviderType {
  const env = import.meta.env.VITE_SWAP_PROVIDER;
  if (env && VALID_PROVIDERS.has(env)) return env as SwapProviderType;
  return "raydium";
}

export const SWAP_PROVIDER: SwapProviderType = resolveProvider();

export interface SwapParams {
  inputMint: PublicKey;
  outputMint: PublicKey;
  amount: BN;
  signer: PublicKey;
  connection: Connection;
}

export interface SwapResult {
  transaction: VersionedTransaction;
  inputAmount: string;
  expectedOutputAmount: string;
  priceImpactPct: number;
}

export interface SwapProvider {
  readonly type: SwapProviderType;
  createTransaction(params: SwapParams): Promise<SwapResult>;
}
