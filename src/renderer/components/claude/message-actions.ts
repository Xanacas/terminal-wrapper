import type { ClaudeMessage } from '~/stores/claude-store'

export type MessageAction = 'fork' | 'rewind'

export function getMessageActions(msg: Pick<ClaudeMessage, 'type' | 'sdkUuid'>): MessageAction[] {
  if (!msg.sdkUuid) return []
  if (msg.type === 'user') return ['fork', 'rewind']
  if (msg.type === 'assistant') return ['fork']
  return []
}
