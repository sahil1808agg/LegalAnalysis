import OpenAI from 'openai'
import { ContextType, ConversationTurn } from './types'

type MessageParam = OpenAI.Chat.ChatCompletionMessageParam

// ─── System prompts ────────────────────────────────────────────────────────

const CONTRACT_SYSTEM = `You are a contract analysis assistant.

Rules:
1. Answer questions ONLY using the contract text provided below.
2. If the answer cannot be found in the contract, respond exactly: "I cannot find this information in the provided contract."
3. Every response MUST end with a page citation in the format [Page X] where X is the most relevant page number.
4. Do not apply general legal knowledge or speculate beyond what the document states.
5. Keep answers concise and clear for a non-lawyer audience.`

const HISTORY_SYSTEM = `You are a contract analysis assistant having an ongoing conversation.

Rules:
1. Answer using ONLY the conversation history — do not invent or add information.
2. If the answer is not in the conversation history, respond exactly: "I don't have that information in our conversation so far."
3. End every response with: [From conversation]
4. Be precise about who said what (you vs the user) when it matters.
5. Do not reference the contract document or general legal knowledge.`

const BOTH_SYSTEM = `You are a contract analysis assistant with access to the contract document and the conversation history.

Rules:
1. Answer using the contract text, the conversation history, or both — whichever is most relevant.
2. For facts drawn from the contract: end with [Page X] (use the most relevant page number).
3. For facts drawn from the conversation: include [From conversation] in your response.
4. When both sources contribute to the answer: include both attributions.
5. If the answer cannot be found in either source, say so explicitly.
6. Do not speculate or apply general legal knowledge.`

// ─── History window sizes ──────────────────────────────────────────────────

// CONTRACT/BOTH: keep window smaller to leave token budget for the contract text
// HISTORY: no contract text → expand window to capture longer conversations
const MAX_HISTORY_TURNS: Record<ContextType, number> = {
  CONTRACT: 10,
  HISTORY: 20,
  BOTH: 10,
}

// ─── Builder ───────────────────────────────────────────────────────────────

/**
 * Assembles the OpenAI messages array for a given context type.
 *
 * CONTRACT — injects contract text; focuses model on document source attribution.
 * HISTORY  — omits contract text entirely; focuses model on conversation history.
 * BOTH     — injects contract text; instructs model to draw from both sources.
 */
export function buildContextMessages(
  type: ContextType,
  contractText: string,
  history: ConversationTurn[],
  question: string
): MessageParam[] {
  const recentHistory = history.slice(-MAX_HISTORY_TURNS[type])

  const historyMessages: MessageParam[] = recentHistory.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // HISTORY: conversation is the only source — omit the contract text
  if (type === 'HISTORY') {
    return [
      { role: 'system', content: HISTORY_SYSTEM },
      ...historyMessages,
      { role: 'user', content: question },
    ]
  }

  // CONTRACT or BOTH: inject contract as a priming user/assistant exchange first
  const contractPrimingAck =
    type === 'CONTRACT'
      ? 'Understood. I will answer strictly from this contract and include a [Page X] citation in every response.'
      : 'Understood. I will answer from the contract and our conversation history, attributing each fact to its source.'

  return [
    { role: 'system', content: type === 'CONTRACT' ? CONTRACT_SYSTEM : BOTH_SYSTEM },
    {
      role: 'user',
      content: `Here is the contract text you must use to answer questions:\n\n${contractText}`,
    },
    { role: 'assistant', content: contractPrimingAck },
    ...historyMessages,
    { role: 'user', content: question },
  ]
}
