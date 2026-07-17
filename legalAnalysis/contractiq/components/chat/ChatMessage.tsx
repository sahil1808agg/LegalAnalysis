import { ChatMessage as ChatMessageType, ContextType } from '@/types'
import { cn } from '@/lib/utils/cn'

interface ChatMessageProps {
  message: ChatMessageType
  onPageSelect: (page: number) => void
}

const SOURCE_LABELS: Record<ContextType, string> = {
  CONTRACT: 'From contract',
  HISTORY: 'From conversation',
  BOTH: 'From contract & conversation',
}

function parsePageCitations(content: string, onPageSelect: (n: number) => void): React.ReactNode[] {
  const parts = content.split(/(\[page \d+\])/gi)
  return parts.map((part, i) => {
    const match = part.match(/\[page (\d+)\]/i)
    if (match) {
      const pageNum = parseInt(match[1], 10)
      return (
        <button
          key={i}
          type="button"
          onClick={() => onPageSelect(pageNum)}
          className="font-medium text-blue-500 underline hover:text-blue-600"
        >
          {part}
        </button>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function ChatMessage({ message, onPageSelect }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'rounded-tr-sm bg-blue-500 text-white'
            : 'rounded-tl-sm bg-grey-50 text-grey-900'
        )}
      >
        {isUser ? (
          message.content
        ) : (
          <span>{parsePageCitations(message.content, onPageSelect)}</span>
        )}
      </div>
      {!isUser && message.contextType && (
        <span className="mt-1 px-1 text-[10px] font-medium text-grey-300">
          {SOURCE_LABELS[message.contextType]}
        </span>
      )}
    </div>
  )
}
