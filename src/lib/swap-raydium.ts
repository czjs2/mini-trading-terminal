import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import {
  NATIVE_MINT,
  createTransferInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import BN from "bn.js";
import axios, { AxiosInstance } from "axios";
import type { SwapProvider, SwapParams, SwapResult } from "./swap-provider";

interface RaydiumQuoteData {
  swapType: string;
  inputMint: string;
  inputAmount: string;
  outputMint: string;
  outputAmount: string;
  otherAmountThreshold: string;
  slippageBps: number;
  priceImpactPct: number;
  referrerAmount: string;
  routePlan: Array<{
    poolId: string;
    inputMint: string;
    outputMint: string;
    feeMint: string;
    feeRate: number;
    feeAmount: string;
    remainingAccounts: string[];
    lastPoolPriceX64: string;
  }>;
}

interface RaydiumQuoteResponse {
  id: string;
  success: boolean;
  version: string;
  data: RaydiumQuoteData;
  msg?: string;
}

interface RaydiumTxResponse {
  id: string;
  success: boolean;
  version: string;
  data: Array<{ transaction: string }>;
  msg?: string;
}

const REFERRAL_FEE_BPS = 100;
const SLIPPAGE_BPS = 50;
const COMPUTE_UNIT_PRICE_MICRO_LAMPORTS = "100000";
const REFERRAL_ACCOUNT = import.meta.env.VITE_JUPITER_REFERRAL_ACCOUNT || "";

export class RaydiumSwapProvider implements SwapProvider {
  readonly type = "raydium" as const;

  private client: AxiosInstance = axios.create({
    baseURL: "https://transaction-v1.raydium.io",
    timeout: 30_000,
  });

  async createTransaction(params: SwapParams): Promise<SwapResult> {
    const { inputMint, outputMint, amount, signer, connection } = params;

    const chargeFee = REFERRAL_ACCOUNT.length > 0;
    const feeBN = chargeFee
      ? amount.muln(REFERRAL_FEE_BPS).divn(10_000)
      : new BN(0);
    const swapAmountBN = amount.sub(feeBN);

    const quoteResponse = await this.getQuote(
      inputMint.toString(),
      outputMint.toString(),
      swapAmountBN.toString(),
    );

    if (!quoteResponse.success) {
      throw new Error(quoteResponse.msg ?? "Raydium quote failed");
    }

    const txBase64 = await this.buildSwapTransaction(
      quoteResponse,
      signer.toString(),
    );

    if (!chargeFee) {
      return {
        transaction: VersionedTransaction.deserialize(
          Buffer.from(txBase64, "base64"),
        ),
        inputAmount: swapAmountBN.toString(),
        expectedOutputAmount: quoteResponse.data.outputAmount,
        priceImpactPct: quoteResponse.data.priceImpactPct,
      };
    }

    const raydiumTx = VersionedTransaction.deserialize(
      Buffer.from(txBase64, "base64"),
    );

    const altAccounts = await this.resolveAddressLookupTables(
      raydiumTx.message,
      connection,
    );

    const msg = TransactionMessage.decompile(raydiumTx.message, {
      addressLookupTableAccounts: altAccounts,
    });

    const feeInstructions = this.buildFeeInstructions(
      inputMint,
      signer,
      feeBN,
    );
    msg.instructions.unshift(...feeInstructions);

    const newMessage = msg.compileToV0Message(altAccounts);
    const transaction = new VersionedTransaction(newMessage);

    return {
      transaction,
      inputAmount: swapAmountBN.toString(),
      expectedOutputAmount: quoteResponse.data.outputAmount,
      priceImpactPct: quoteResponse.data.priceImpactPct,
    };
  }

  private async getQuote(
    inputMint: string,
    outputMint: string,
    amount: string,
  ): Promise<RaydiumQuoteResponse> {
    const { data } = await this.client.get<RaydiumQuoteResponse>(
      "/compute/swap-base-in",
      {
        params: {
          inputMint,
          outputMint,
          amount,
          slippageBps: SLIPPAGE_BPS,
          txVersion: "V0",
        },
      },
    );
    return data;
  }

  private async buildSwapTransaction(
    quoteResponse: RaydiumQuoteResponse,
    wallet: string,
  ): Promise<string> {
    const { data } = await this.client.post<RaydiumTxResponse>(
      "/transaction/swap-base-in",
      {
        computeUnitPriceMicroLamports: COMPUTE_UNIT_PRICE_MICRO_LAMPORTS,
        swapResponse: quoteResponse,
        wallet,
        txVersion: "V0",
        wrapSol: true,
        unwrapSol: true,
      },
    );

    if (!data.success || !data.data?.[0]?.transaction) {
      throw new Error(data.msg ?? "Raydium transaction build failed");
    }

    return data.data[0].transaction;
  }

  private async resolveAddressLookupTables(
    message: VersionedTransaction["message"],
    connection: Connection,
  ): Promise<AddressLookupTableAccount[]> {
    if (!("addressTableLookups" in message) || message.addressTableLookups.length === 0) {
      return [];
    }

    const results = await Promise.all(
      message.addressTableLookups.map((lookup) =>
        connection.getAddressLookupTable(lookup.accountKey),
      ),
    );

    return results
      .map((r) => r.value)
      .filter((v): v is AddressLookupTableAccount => v !== null);
  }

  private buildFeeInstructions(
    inputMint: PublicKey,
    signer: PublicKey,
    feeAmount: BN,
  ): TransactionInstruction[] {
    const referralAccount = new PublicKey(REFERRAL_ACCOUNT);

    if (inputMint.equals(NATIVE_MINT)) {
      return [
        SystemProgram.transfer({
          fromPubkey: signer,
          toPubkey: referralAccount,
          lamports: BigInt(feeAmount.toString()),
        }),
      ];
    }

    const userAta = getAssociatedTokenAddressSync(inputMint, signer, false);
    const referralAta = getAssociatedTokenAddressSync(
      inputMint,
      referralAccount,
      true,
    );

    return [
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        referralAta,
        referralAccount,
        inputMint,
      ),
      createTransferInstruction(
        userAta,
        referralAta,
        signer,
        BigInt(feeAmount.toString()),
      ),
    ];
  }
}
