import { useRef, useEffect, useState, useCallback } from 'react'
import type { ClaudeMessage } from '~/stores/claude-store'
import { MessageItem } from './message-item'
import { renderMarkdown } from '~/lib/markdown'

interface MessageListProps {
  messages: ClaudeMessage[]
  currentStreamText: string
  isStreaming: boolean
  pendingPermissions: Array<{ toolUseId: string; toolName: string; input: unknown; title?: string }>
  onApprovePermission: (toolUseId: string) => void
  onApproveWithAnswers?: (toolUseId: string, answers: Record<string, string>) => void
  onDenyPermission: (toolUseId: string) => void
  onAlwaysAllowPermission?: (toolUseId: string, toolName: string) => void
  onLinkClick?: (url: string) => void
}

export function MessageList({
  messages,
  currentStreamText,
  isStreaming,
  pendingPermissions,
  onApprovePermission,
  onApproveWithAnswers,
  onDenyPermission,
  onAlwaysAllowPermission,
  onLinkClick,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showJumpToBottom, setShowJumpToBottom] = useState(false)
  const isAutoScrolling = useRef(true)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    isAutoScrolling.current = true
    setShowJumpToBottom(false)
  }, [])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distanceFromBottom < 60
    isAutoScrolling.current = atBottom
    setShowJumpToBottom(!atBottom)
  }, [])

  // Auto-scroll on new messages / stream updates
  useEffect(() => {
    if (isAutoScrolling.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [messages.length, currentStreamText])

  const pendingIds = new Set(pendingPermissions.map((p) => p.toolUseId))

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-1 py-4"
      >
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
            {/* AI sparkle icon */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/8">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-accent/60">
                <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 12l.75 2.25L18 15l-2.25.75L15 18l-.75-2.25L12 15l2.25-.75L15 12z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
              </svg>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="text-[13px] font-medium text-text-secondary">Claude</div>
              <div className="text-[12px] text-text-dim">Send a message to get started</div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            onLinkClick={onLinkClick}
            onApprovePermission={onApprovePermission}
            onApproveWithAnswers={onApproveWithAnswers}
            onDenyPermission={onDenyPermission}
            onAlwaysAllowPermission={onAlwaysAllowPermission}
            isPendingPermission={msg.toolUseId ? pendingIds.has(msg.toolUseId) : false}
          />
        ))}

        {/* Streaming indicator */}
        {isStreaming && currentStreamText && (
          <div className="px-5 py-1.5">
            <div className="max-w-[95%]">
              {renderMarkdown(currentStreamText, { onLinkClick })}
            </div>
          </div>
        )}

        {isStreaming && (
          <div className="px-5 py-1">
            <span className="inline-block h-[14px] w-[3px] rounded-full bg-accent/50 animate-[pulse_1.2s_ease-in-out_infinite]" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Jump to bottom FAB */}
      {showJumpToBottom && (
        <button
          onClick={scrollToBottom}
          className="glass absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border-bright/50 px-3 py-1.5 text-[11px] text-text-secondary shadow-lg shadow-black/30 transition-all duration-150 hover:bg-bg-hover hover:text-text hover:border-border-bright"
        >
          <span className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 2v6M2 5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Jump to bottom
          </span>
        </button>
      )}
    </div>
  )
}
