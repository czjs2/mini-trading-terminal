import type { SwapProvider, SwapProviderType } from "./swap-provider";
import { JupiterSwapProvider } from "./swap-jupiter";
import { RaydiumSwapProvider } from "./swap-raydium";

const providers: Record<SwapProviderType, SwapProvider> = {
  jupiter: new JupiterSwapProvider(),
  raydium: new RaydiumSwapProvider(),
};

export function getSwapProvider(type: SwapProviderType): SwapProvider {
  return providers[type];
}
