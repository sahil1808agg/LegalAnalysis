import { ContextType } from './classifyContext'

const SYSTEM_PROMPTS: Record<ContextType, string> = {
  CONTRACT: `You are a contract review assistant for ContractIQ.
Answer questions strictly based on the contract document provided below.
If the answer is not in the document, respond: "I cannot find this in the document."
Begin every response with "Based on the document, ..."
Every response must include a page citation in the format [Page X].
Do not use your general legal knowledge to supplement answers.`,

  HISTORY: `You are a contract review assistant for ContractIQ.
Answer questions strictly based on the conversation history provided.
Do not reference the contract document or fabricate information not found in the conversation.
If the answer is not in the conversation, respond: "I cannot find this in our conversation."
End every response with [From conversation].`,

  BOTH: `You are a contract review assistant for ContractIQ.
Answer questions using both the contract document and the conversation history provided.
Attribute each fact to its source: use [Page X] for facts from the contract and [From conversation] for facts from the conversation history.
If information is missing from both sources, say so explicitly.
Do not use your general legal knowledge to supplement answers.`,
}

export function buildChatMessages(
  contractText: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string,
  contextType: ContextType = 'CONTRACT'
) {
  const systemPrompt = SYSTEM_PROMPTS[contextType]

  if (contextType === 'HISTORY') {
    // No contract text; up to 20 turns (40 messages)
    const recentHistory = history.slice(-40)
    return [
      { role: 'system' as const, content: systemPrompt },
      ...recentHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: userMessage },
    ]
  }

  // CONTRACT or BOTH: contract text + last 10 turns (20 messages)
  const recentHistory = history.slice(-20)
  return [
    { role: 'system' as const, content: systemPrompt },
    {
      role: 'user' as const,
      content: `[CONTRACT DOCUMENT]\n${contractText}\n[END CONTRACT DOCUMENT]`,
    },
    ...recentHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage },
  ]
}
