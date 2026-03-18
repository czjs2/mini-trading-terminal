import { Codex } from "@codex-data/sdk";

let instance: Codex | null = null;

export const getCodexClient = () => {
  if (instance) return instance;

  const apiKey = import.meta.env.VITE_CODEX_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_CODEX_API_KEY is not set");
  }
  instance = new Codex(apiKey);
  return instance;
};
