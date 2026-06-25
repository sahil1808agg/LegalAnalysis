import OpenAI from 'openai'
import { classifyQuery } from '@/lib/memory/classifier'
import { buildContextMessages } from '@/lib/memory/context-builder'
import { type ContextType, type ConversationTurn } from '@/lib/memory/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ChatResult {
  content: string
  pageCitation: number | null
  contextType: ContextType
}

function extractPageCitation(text: string): number | null {
  const match = text.match(/\[Page\s+(\d+)\]/i)
  return match ? parseInt(match[1], 10) : null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Answers a user question by:
 * 1. Classifying whether the question needs contract context, history, or both.
 * 2. Building the appropriate OpenAI messages array.
 * 3. Calling gpt-4o-mini with up to 3 retries on API errors.
 *
 * Returns the response content, an extracted page citation (if any), and the
 * context type that was used — so callers can surface source attribution in the UI.
 */
export async function answerWithMemory(
  contractText: string,
  history: ConversationTurn[],
  question: string
): Promise<ChatResult> {
  const classification = classifyQuery(question, history)
  const messages = buildContextMessages(classification.type, contractText, history, question)

  let lastError: Error | null = null

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.4,
        max_tokens: 1000,
      })

      const content = response.choices[0]?.message?.content ?? ''
      const pageCitation = extractPageCitation(content)

      return { content, pageCitation, contextType: classification.type }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < 2) {
        await sleep(Math.pow(2, attempt) * 2000)
      }
    }
  }

  throw lastError ?? new Error('Chat completion failed after retries')
}
