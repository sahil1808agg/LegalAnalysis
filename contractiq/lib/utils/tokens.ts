// Rough token estimate: ~4 characters per token for English text
const CHARS_PER_TOKEN = 4
const MAX_CONTRACT_TOKENS = 15000

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

export function exceedsTokenLimit(text: string): boolean {
  return estimateTokenCount(text) > MAX_CONTRACT_TOKENS
}

export const MAX_CONTRACT_TOKENS_LIMIT = MAX_CONTRACT_TOKENS
