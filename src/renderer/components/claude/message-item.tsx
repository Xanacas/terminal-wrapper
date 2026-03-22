import type { ClaudeMessage } from '~/stores/claude-store'
import { renderMarkdown } from '~/lib/markdown'
import { ToolUseBlock } from './tool-use-block'
import { PermissionPrompt } from './permission-prompt'
import { AskUserQuestionPrompt, AskUserQuestionResolved } from './ask-user-question-prompt'

interface MessageItemProps {
  message: ClaudeMessage
  onLinkClick?: (url: string) => void
  onApprovePermission?: (toolUseId: string) => void
  onApproveWithAnswers?: (toolUseId: string, answers: Record<string, string>) => void
  onDenyPermission?: (toolUseId: string) => void
  onAlwaysAllowPermission?: (toolUseId: string, toolName: string) => void
  isPendingPermission?: boolean
}

export function MessageItem({
  message,
  onLinkClick,
  onApprovePermission,
  onApproveWithAnswers,
  onDenyPermission,
  onAlwaysAllowPermission,
  isPendingPermission,
}: MessageItemProps) {
  switch (message.type) {
    case 'user':
      return (
        <div className="flex justify-end px-4 py-1.5">
          <div className="max-w-[85%] rounded-xl rounded-br-[6px] bg-accent/10 px-3.5 py-2.5 text-[12.5px] leading-[1.6] text-text">
            {message.images && message.images.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {message.images.map((img, i) => (
                  <img
                    key={i}
                    src={`data:${img.mediaType};base64,${img.base64}`}
                    alt="Attached"
                    className="h-16 w-16 rounded-md border border-accent/20 object-cover"
                  />
                ))}
              </div>
            )}
            {message.content}
          </div>
        </div>
      )

    case 'assistant':
      return (
        <div className="px-5 py-2">
          <div className="max-w-[95%]">
            {renderMarkdown(message.content, { onLinkClick })}
          </div>
        </div>
      )

    case 'tool-use':
      return (
        <div className="px-4 py-0.5">
          <ToolUseBlock
            toolName={message.toolName ?? 'Unknown'}
            toolUseId={message.toolUseId ?? ''}
            input={message.toolInput}
          />
        </div>
      )

    case 'tool-result':
      return (
        <div className="px-4 py-0.5">
          <ToolUseBlock
            toolName="Result"
            toolUseId={message.toolUseId ?? ''}
            output={message.toolOutput}
            isError={message.isError}
          />
        </div>
      )

    case 'permission-request': {
      const isAskUserQuestion = message.toolName === 'AskUserQuestion'

      return (
        <div className="px-4 py-0.5">
          {isPendingPermission ? (
            isAskUserQuestion && onApproveWithAnswers && onDenyPermission ? (
              <AskUserQuestionPrompt
                toolUseId={message.toolUseId ?? ''}
                input={message.toolInput}
                onSubmit={onApproveWithAnswers}
                onDeny={onDenyPermission}
              />
            ) : onApprovePermission && onDenyPermission ? (
              <PermissionPrompt
                toolName={message.toolName ?? 'Unknown'}
                toolUseId={message.toolUseId ?? ''}
                input={message.toolInput}
                title={message.permissionTitle}
                onApprove={onApprovePermission}
                onDeny={onDenyPermission}
                onAlwaysAllow={onAlwaysAllowPermission}
              />
            ) : null
          ) : (
            isAskUserQuestion ? (
              <AskUserQuestionResolved input={message.toolInput} />
            ) : (
              <div className="rounded-lg border border-border bg-bg-secondary px-3 py-2">
                <span className="text-[11px] text-text-dim">
                  Permission resolved: {message.toolName}
                </span>
              </div>
            )
          )}
        </div>
      )
    }

    case 'system':
      return (
        <div className="flex justify-center px-4 py-2">
          <span className="flex max-w-[90%] items-center gap-1.5 text-center text-[11px] leading-[1.5] text-text-dim">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0 text-text-dim">
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1" />
              <path d="M5 3.5v2M5 7h.005" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {message.content}
          </span>
        </div>
      )

    default:
      return null
  }
}
