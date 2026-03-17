import { useCallback } from 'react'
import { api } from '~/lib/ipc'
import { useClaude } from '~/hooks/use-claude'
import { ClaudeToolbar } from './claude-toolbar'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'
import { ClaudeCwdPrompt } from './claude-cwd-prompt'
import { ClaudeSettingsModal } from './claude-settings-modal'
import { ClaudeSessionHistoryPanel } from './claude-session-history'
import type { EffortLevel, PermissionMode, ClaudePanelConfig } from '~/stores/claude-store'

interface ClaudeViewProps {
  panelId: string
  cwd: string
  onOpenUrl?: (url: string) => void
}

export function ClaudeView({ panelId, cwd, onOpenUrl }: ClaudeViewProps) {
  const {
    messages,
    isStreaming,
    currentStreamText,
    pendingPermissions,
    sessionId,
    config,
    costUsd,
    inputTokens,
    outputTokens,
    settingsOpen,
    historyOpen,
    pendingCwdChange,
    sendMessage,
    interrupt,
    approvePermission,
    denyPermission,
    alwaysAllowTool,
    updateConfig,
    changeCwd,
    confirmCwdChange,
    cancelCwdChange,
    listSessions,
    resumeSession,
    toggleSettings,
    toggleHistory,
    newSession,
  } = useClaude(panelId, cwd)

  const handleLinkClick = useCallback(
    (url: string) => {
      if (onOpenUrl) {
        onOpenUrl(url)
      } else {
        api.openExternal(url)
      }
    },
    [onOpenUrl]
  )

  const handleModelChange = useCallback(
    (model: string) => updateConfig({ model }),
    [updateConfig]
  )

  const handlePermissionModeChange = useCallback(
    (mode: PermissionMode) => updateConfig({ permissionMode: mode }),
    [updateConfig]
  )

  const handleEffortChange = useCallback(
    (effort: EffortLevel) => updateConfig({ effort }),
    [updateConfig]
  )

  const handleUseDefaultCwd = useCallback(() => {
    if (cwd) updateConfig({ cwd })
  }, [cwd, updateConfig])

  const handleSettingsSave = useCallback(
    (updates: Partial<ClaudePanelConfig>) => updateConfig(updates),
    [updateConfig]
  )

  const hasCwd = Boolean(config.cwd)

  return (
    <div className="flex h-full flex-col bg-bg">
      <ClaudeToolbar
        config={config}
        costUsd={costUsd}
        inputTokens={inputTokens}
        outputTokens={outputTokens}
        sessionId={sessionId}
        onModelChange={handleModelChange}
        onPermissionModeChange={handlePermissionModeChange}
        onEffortChange={handleEffortChange}
        onCwdClick={changeCwd}
        onSettingsClick={toggleSettings}
        onHistoryClick={toggleHistory}
        onNewSession={newSession}
      />
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border-bright/50 to-transparent" />

      {historyOpen && (
        <ClaudeSessionHistoryPanel
          listSessions={listSessions}
          onResume={(sessionId) => {
            resumeSession(sessionId)
            toggleHistory()
          }}
          onClose={toggleHistory}
        />
      )}

      {!hasCwd ? (
        <ClaudeCwdPrompt
          onBrowse={changeCwd}
          defaultCwd={cwd}
          onUseDefault={cwd ? handleUseDefaultCwd : undefined}
        />
      ) : (
        <MessageList
          messages={messages}
          currentStreamText={currentStreamText}
          isStreaming={isStreaming}
          pendingPermissions={pendingPermissions}
          onApprovePermission={approvePermission}
          onDenyPermission={denyPermission}
          onAlwaysAllowPermission={alwaysAllowTool}
          onLinkClick={handleLinkClick}
        />
      )}

      {pendingCwdChange && (
        <div className="shrink-0 border-t border-warning/20 bg-warning/10 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-warning">
              <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <span className="min-w-0 flex-1 text-[12px] text-text-secondary">
              Changing working directory will end the current session.
            </span>
            <button
              onClick={confirmCwdChange}
              className="rounded-md bg-warning/20 px-3 py-1 text-[11px] font-medium text-warning transition-colors hover:bg-warning/30"
            >
              Confirm
            </button>
            <button
              onClick={cancelCwdChange}
              className="rounded-md px-3 py-1 text-[11px] font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ChatInput
        onSend={sendMessage}
        onInterrupt={interrupt}
        isStreaming={isStreaming}
        disabled={!hasCwd}
      />

      {settingsOpen && (
        <ClaudeSettingsModal
          config={config}
          onSave={handleSettingsSave}
          onClose={toggleSettings}
        />
      )}
    </div>
  )
}
