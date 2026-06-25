'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2, FileText, MessageSquare, Layers } from 'lucide-react'
import { ChatMessage } from '@/types'
import { type ContextType } from '@/lib/memory/types'

interface DisplayMessage extends ChatMessage {
  context_type?: ContextType
}

interface ChatPanelProps {
  contractId: string
  onPageCite: (page: number) => void
}

const WELCOME: DisplayMessage = {
  id: '__welcome__',
  session_id: '',
  user_id: '',
  role: 'assistant',
  content:
    'Hi! I\'ve read your contract. Ask me anything — e.g. "What are the confidentiality obligations?" or "How long does this NDA last?"',
  page_citation: null,
  created_at: '',
}

// ─── Source badge ──────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<
  ContextType,
  { icon: typeof FileText; label: string; classes: string }
> = {
  CONTRACT: {
    icon: FileText,
    label: 'From contract',
    classes: 'bg-blue-50 text-blue-700',
  },
  HISTORY: {
    icon: MessageSquare,
    label: 'From conversation',
    classes: 'bg-purple-50 text-purple-700',
  },
  BOTH: {
    icon: Layers,
    label: 'Contract + conversation',
    classes: 'bg-teal-50 text-teal-700',
  },
}

function SourceBadge({ type }: { type: ContextType }) {
  const { icon: Icon, label, classes } = SOURCE_CONFIG[type]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium mt-1.5 ${classes}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

// ─── Infer context type from message content when not explicitly provided ──

function inferContextType(content: string): ContextType | undefined {
  const hasPage = /\[Page\s+\d+\]/i.test(content)
  const hasConversation = /\[From conversation\]/i.test(content)
  if (hasPage && hasConversation) return 'BOTH'
  if (hasConversation) return 'HISTORY'
  if (hasPage) return 'CONTRACT'
  return undefined
}

// ─── Component ─────────────────────────────────────────────────────────────

export function ChatPanel({ contractId, onPageCite }: ChatPanelProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load persisted conversation history on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/contracts/${contractId}/chat-messages`)
        if (!res.ok) return
        const data = await res.json()
        if (data.messages && data.messages.length > 0) {
          // Infer context_type from content for historically saved messages
          const enriched: DisplayMessage[] = data.messages.map((m: ChatMessage) => ({
            ...m,
            context_type: m.role === 'assistant' ? inferContextType(m.content) : undefined,
          }))
          setMessages([WELCOME, ...enriched])
        }
      } catch {
        setLoadError(true)
      }
    }
    load()
  }, [contractId])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  async function handleSend() {
    const question = input.trim()
    if (!question || sending) return

    const userMsg: DisplayMessage = {
      id: `tmp-user-${Date.now()}`,
      session_id: '',
      user_id: '',
      role: 'user',
      content: question,
      page_citation: null,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId, message: question }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const errMsg: DisplayMessage = {
          id: `tmp-err-${Date.now()}`,
          session_id: '',
          user_id: '',
          role: 'assistant',
          content: errData.error ?? 'Sorry, something went wrong. Please try again.',
          page_citation: null,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errMsg])
        return
      }

      const data = await res.json()
      const assistantMsg: DisplayMessage = {
        ...data.message,
        context_type: data.context_type as ContextType | undefined,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      const errMsg: DisplayMessage = {
        id: `tmp-net-${Date.now()}`,
        session_id: '',
        user_id: '',
        role: 'assistant',
        content: 'Network error. Please check your connection and try again.',
        page_citation: null,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loadError && (
          <p className="text-xs text-center text-text-secondary py-2">
            Could not load previous messages.
          </p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-br-sm'
                    : 'bg-gray-100 text-text-primary rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Page citation link */}
                {msg.page_citation != null && (
                  <button
                    onClick={() => onPageCite(msg.page_citation!)}
                    className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${
                      msg.role === 'user'
                        ? 'text-blue-200 hover:text-white'
                        : 'text-primary hover:underline'
                    }`}
                  >
                    <FileText className="h-3 w-3" />
                    View Page {msg.page_citation}
                  </button>
                )}
              </div>

              {/* Source attribution badge (assistant messages only) */}
              {msg.role === 'assistant' && msg.context_type && msg.id !== '__welcome__' && (
                <SourceBadge type={msg.context_type} />
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <Loader2 className="h-4 w-4 text-text-secondary animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this contract…"
            rows={2}
            className="input flex-1 text-sm resize-none py-2"
            maxLength={1000}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="btn-primary p-2.5 shrink-0 disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-xs text-text-secondary">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
