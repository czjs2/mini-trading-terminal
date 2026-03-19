/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CODEX_API_KEY: string
  readonly VITE_HELIUS_RPC_URL: string
  readonly VITE_SOLANA_PRIVATE_KEY: string
  readonly VITE_JUPITER_REFERRAL_ACCOUNT: string
  readonly VITE_SWAP_PROVIDER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}