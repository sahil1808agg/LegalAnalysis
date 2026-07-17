'use client'

import { useEffect, useState } from 'react'
import { ChatMessage } from '@/types'

export function useChat(contractId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/contracts/${contractId}/chat`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages ?? [])
        setSessionId(data.sessionId ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [contractId])

  const sendMessage = async (content: string) => {
    if (!content.trim() || sending) return

    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])
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

      const { userMessage, assistantMessage } = data
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== optimisticMsg.id)
          .concat([
            { id: userMessage.id, role: 'user', content: userMessage.content, createdAt: userMessage.createdAt },
            { id: assistantMessage.id, role: 'assistant', content: assistantMessage.content, createdAt: assistantMessage.createdAt, contextType: assistantMessage.contextType },
          ])
      )
    } catch {
      clearTimeout(timeoutId)
      setError('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return { messages, sessionId, loading, sending, error, sendMessage }
}
