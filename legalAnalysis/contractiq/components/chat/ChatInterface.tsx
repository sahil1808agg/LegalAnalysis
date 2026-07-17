'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@/hooks/useChat'
import { ChatMessage } from './ChatMessage'
import { Button } from '@/components/ui/Button'

interface ChatInterfaceProps {
  contractId: string
  onPageSelect: (page: number) => void
}

export function ChatInterface({ contractId, onPageSelect }: ChatInterfaceProps) {
  const { messages, loading, sending, error, sendMessage } = useChat(contractId)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || sending) return
    setInput('')
    sendMessage(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-grey-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-grey-900">Chat with your contract</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-grey-500">Ask anything about this contract</p>
            <p className="text-xs text-grey-300">e.g. "What is the termination notice period?"</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} onPageSelect={onPageSelect} />
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-grey-50 px-4 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-grey-300 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-grey-300 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-grey-300 [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && (
        <p className="px-4 pb-2 text-xs text-red-600">{error}</p>
      )}

      <div className="border-t border-grey-100 p-3">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this contract…"
            rows={2}
            disabled={sending}
            className="flex-1 resize-none rounded-lg border border-grey-100 px-3 py-2 text-sm text-grey-900 placeholder:text-grey-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            loading={sending}
            className="self-end"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
