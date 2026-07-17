# Spec 06 — Chat with Contract

## Overview

Each results page has a chat tab/sidebar where users can ask questions about the contract. GPT-4o answers strictly from the contract text, must cite `[Page X]` in every response, and begins every answer with "Based on the document, ...". Messages are persisted in `chat_sessions` + `chat_messages` and restored on page revisit.

---

## Acceptance Criteria

- Chat input is available on the results page (tab or sidebar)
- Previous messages load on mount (GET chat history)
- User message appears immediately (optimistic update) while awaiting response
- AI response appears within 15 s P95; after 20 s show timeout message
- Every AI response starts with "Based on the document, ..."
- Every AI response contains at least one `[Page X]` citation
- Clicking a `[Page X]` citation scrolls the PDF/text viewer to that page
- Off-document questions return "I cannot find this in the document."
- Chat session is created automatically on first message — user does not trigger this
- Full conversation history is preserved across page reloads
- Input is disabled while a response is in-flight
- Message history capped at 200 messages in the prompt; oldest messages are excluded from context (not from display)

---

## Files to Create

```
contractiq/
├── app/
│   └── api/
│       └── contracts/
│           └── [id]/
│               └── chat/
│                   └── route.ts          ← GET + POST /api/contracts/[id]/chat
├── components/
│   └── chat/
│       ├── ChatInterface.tsx             ← Input + message list + session management
│       └── ChatMessage.tsx              ← Single message; [Page X] as clickable link
├── hooks/
│   └── useChat.ts                       ← Chat state, send, load history
└── lib/
    └── openai/
        └── chatPrompt.ts                ← Builds chat prompt (system + contract + history)
supabase/
└── functions/
    └── chat/
        └── index.ts                     ← Deno Edge Function
```

---

## `hooks/useChat.ts`

```ts
'use client'
import { useState, useEffect } from 'react'
import { ChatMessage } from '@/types'

export function useChat(contractId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load history on mount
  useEffect(() => {
    fetch(`/api/contracts/${contractId}/chat`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.messages ?? [])
        setSessionId(data.sessionId ?? null)
        setLoading(false)
      })
  }, [contractId])

  const sendMessage = async (content: string) => {
    if (!content.trim() || sending) return

    // Optimistic update
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticMsg])
    setSending(true)
    setError(null)

    const timeoutId = setTimeout(() => {
      setSending(false)
      setError('Response timed out. Please try again.')
    }, 20000)

    try {
      const res = await fetch(`/api/contracts/${contractId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      })

      clearTimeout(timeoutId)

      if (res.status === 408) {
        setError('Response timed out. Please try again.')
        return
      }

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }

      setSessionId(data.sessionId)
      const assistantMsg: ChatMessage = {
        id: data.messageId,
        role: 'assistant',
        content: data.content,
        createdAt: data.createdAt,
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      clearTimeout(timeoutId)
      setError('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return { messages, sessionId, loading, sending, error, sendMessage }
}
```

---

## `components/chat/ChatInterface.tsx`

**Type:** `'use client'`

**Props:**
```ts
interface ChatInterfaceProps {
  contractId: string
  onPageSelect: (page: number) => void  // scroll PDF viewer on [Page X] click
}
```

**Layout:**
```
┌──────────────────────────────────────────┐
│  Chat with your contract                 │
├──────────────────────────────────────────┤
│  [message list — scrollable]             │
│                                          │
│  [typing indicator when sending]         │
├──────────────────────────────────────────┤
│  [textarea]              [Send button]   │
└──────────────────────────────────────────┘
```

**Behaviour:**
- Message list auto-scrolls to bottom after each new message
- Send on Enter (not Shift+Enter, which adds a newline)
- Submit button disabled when input is empty or `sending` is true
- Input disabled while `sending` is true
- Typing indicator: three animated dots, left-aligned, visible only while `sending`
- Error message renders below the input if `error` is not null

---

## `components/chat/ChatMessage.tsx`

**Props:**
```ts
interface ChatMessageProps {
  message: ChatMessage
  onPageSelect: (page: number) => void
}
```

**Alignment:**
- `role === 'user'` → right-aligned, blue background (`bg-blue-500 text-white`)
- `role === 'assistant'` → left-aligned, grey background (`bg-grey-50`)

**`[Page X]` parsing:**

Parse all `[Page X]` or `[page X]` patterns in `content` and render each as a clickable button:

```ts
function parsePageCitations(content: string, onPageSelect: (n: number) => void): React.ReactNode[] {
  const parts = content.split(/(\[page \d+\])/gi)
  return parts.map((part, i) => {
    const match = part.match(/\[page (\d+)\]/i)
    if (match) {
      const pageNum = parseInt(match[1])
      return (
        <button
          key={i}
          onClick={() => onPageSelect(pageNum)}
          className="text-blue-500 underline hover:text-blue-600 font-medium"
        >
          {part}
        </button>
      )
    }
    return <span key={i}>{part}</span>
  })
}
```

---

## API Route — `GET /api/contracts/[id]/chat`

**File:** `app/api/contracts/[id]/chat/route.ts`

**Response:**
```json
{
  "sessionId": "uuid or null",
  "messages": [
    { "id": "uuid", "role": "user", "content": "...", "createdAt": "..." },
    { "id": "uuid", "role": "assistant", "content": "...", "createdAt": "..." }
  ]
}
```

**Implementation:**
1. Auth check
2. Verify contract ownership
3. `SELECT id FROM chat_sessions WHERE contract_id = $id AND user_id = $uid`
4. If no session: return `{ sessionId: null, messages: [] }`
5. If session found: `SELECT id, role, content, created_at FROM chat_messages WHERE session_id = $sid ORDER BY created_at ASC`
6. Return `{ sessionId, messages }`

---

## API Route — `POST /api/contracts/[id]/chat`

**File:** `app/api/contracts/[id]/chat/route.ts` (same file, different HTTP method)

**Request body:** `{ "message": "string" }`

**Implementation:**
1. Auth check; validate message is non-empty
2. Verify contract ownership
3. Call `chat` Supabase Edge Function with `{ contract_id, user_id, user_message }`
4. Return edge function response (see below)

**Response `200`:**
```json
{
  "messageId": "uuid",
  "sessionId": "uuid",
  "role": "assistant",
  "content": "Based on the document, ...",
  "createdAt": "2026-07-16T10:35:03Z"
}
```

**Error responses:**
```
400 { error: "Message cannot be empty." }
401 { error: "Unauthorized" }
403 { error: "Forbidden" }
408 { error: "Response timed out. Please try again." }
500 { error: "Analysis failed. Please try again." }
```

---

## `lib/openai/chatPrompt.ts`

```ts
export const CHAT_SYSTEM_PROMPT = `You are a contract review assistant for ContractIQ.
Answer questions strictly based on the contract document provided below.
If the answer is not in the document, respond: "I cannot find this in the document."
Begin every response with "Based on the document, ..."
Every response must include a page citation in the format [Page X].
Do not use your general legal knowledge to supplement answers.`

export function buildChatPrompt(
  contractText: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string
) {
  // Keep last 200 messages (100 turns) for context
  const trimmedHistory = history.slice(-200)

  return [
    { role: 'system' as const, content: CHAT_SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: `[CONTRACT DOCUMENT]\n${contractText}\n[END CONTRACT DOCUMENT]`
    },
    ...trimmedHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage }
  ]
}
```

---

## `supabase/functions/chat/index.ts` (Deno Edge Function)

```ts
serve(async (req) => {
  const { contract_id, user_id, user_message } = await req.json()

  // 1. Fetch contract text
  const { data: contract } = await supabase
    .from('contracts')
    .select('contract_text')
    .eq('id', contract_id)
    .eq('user_id', user_id)
    .single()

  // 2. Get or create chat session
  let session = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('contract_id', contract_id)
    .eq('user_id', user_id)
    .single()

  if (!session.data) {
    const { data: newSession } = await supabase
      .from('chat_sessions')
      .insert({ contract_id, user_id })
      .select('id')
      .single()
    session = { data: newSession }
  }

  const session_id = session.data.id

  // 3. Load history (up to 200 messages)
  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true })
    .limit(200)

  // 4. Save user message
  await supabase.from('chat_messages').insert({
    session_id,
    role: 'user',
    content: user_message
  })

  // 5. Build prompt and call GPT-4o
  const messages = buildChatPrompt(contract.contract_text, history ?? [], user_message)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.4,
    max_tokens: 1000,
    messages,
  })

  const responseContent = completion.choices[0].message.content ?? ''

  // 6. Save assistant message
  const { data: savedMsg } = await supabase
    .from('chat_messages')
    .insert({ session_id, role: 'assistant', content: responseContent })
    .select('id, created_at')
    .single()

  return new Response(JSON.stringify({
    messageId: savedMsg.id,
    sessionId: session_id,
    role: 'assistant',
    content: responseContent,
    createdAt: savedMsg.created_at,
  }), { status: 200 })
})
```

**OpenAI timeout handling:** Set `signal: AbortSignal.timeout(18000)` on the fetch inside the SDK. If it throws `AbortError`, return 408.

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| First message on a contract | Session created automatically in edge function |
| Question not in document | AI returns "I cannot find this in the document." — correct, not an error |
| Response > 20 s | Client-side timeout shows "Response timed out. Please try again." |
| History > 200 messages | Oldest messages excluded from prompt (not from UI display) |
| Concurrent sends from same user | Input disabled after first send; second is impossible |
| Empty message submitted | Disabled state on button prevents this; API also validates |
| Contract text very long | Token budget: ≤ 15,000 contract tokens + ≤ 4,000 history + system = under 128k context window |
