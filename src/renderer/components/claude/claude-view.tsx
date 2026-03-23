import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { api } from '~/lib/ipc'
import { useClaude, getForkDestinations, mapHistoryToMessages } from '~/hooks/use-claude'
import type { ForkDestination } from '~/hooks/use-claude'
import { useClaudeStore } from '~/stores/claude-store'
import { useAppStore } from '~/stores/app-store'
import { useProjects } from '~/hooks/use-projects'
import { ClaudeToolbar } from './claude-toolbar'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'
import { ClaudeCwdPrompt } from './claude-cwd-prompt'
import { ClaudeSettingsModal } from './claude-settings-modal'
import { ClaudeSessionHistoryPanel } from './claude-session-history'
import { getModelsForPanel, getEffortLevelsForModel, getSlashCommandsForPanel, getAccountInfoForPanel, getFastModeStateForPanel, getAgentsForPanel, deriveAgentTeamsState } from '~/stores/claude-store'
import { AgentTeamsPanel } from './agent-teams-panel'
import { AgentsModal } from './agents-modal'
import type { EffortLevel, PermissionMode, ClaudePanelConfig, ClaudePanelState } from '~/stores/claude-store'

interface ClaudeViewProps {
  panelId: string
  projectId: string
  tabId: string
  cwd: string
  onOpenUrl?: (url: string) => void
}

export function ClaudeView({ panelId, projectId, tabId, cwd, onOpenUrl }: ClaudeViewProps) {
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
    approveWithAnswers,
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
    restoreStatus,
    restoreError,
    initResult,
    backgroundTasks,
    stopTask,
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

  const panelForHelpers = useMemo(() => ({ initResult, config }) as ClaudePanelState, [initResult, config])
  const availableModels = useMemo(() => getModelsForPanel(panelForHelpers), [panelForHelpers])
  const availableEffortLevels = useMemo(() => getEffortLevelsForModel(panelForHelpers), [panelForHelpers])
  const slashCommands = useMemo(() => getSlashCommandsForPanel(panelForHelpers), [panelForHelpers])
  const accountInfo = useMemo(() => getAccountInfoForPanel(panelForHelpers), [panelForHelpers])
  const fastModeState = useMemo(() => getFastModeStateForPanel(panelForHelpers), [panelForHelpers])
  const agents = useMemo(() => getAgentsForPanel(panelForHelpers), [panelForHelpers])
  const teamsState = useMemo(() => deriveAgentTeamsState(backgroundTasks), [backgroundTasks])

  // Fork destination picker state
  const [forkState, setForkState] = useState<{ sdkUuid: string; x: number; y: number } | null>(null)
  const [agentsModalOpen, setAgentsModalOpen] = useState(false)
  const forkMenuRef = useRef<HTMLDivElement>(null)

  const activeThreadDevContainer = useAppStore((s) => {
    const p = s.projects.find((proj) => proj.id === s.activeProjectId)
    const thread = p?.threads.find((t) => t.id === p.activeThreadId)
    return thread?.devContainer
  })

  const forkDestinations = useMemo(
    () => getForkDestinations(!!activeThreadDevContainer),
    [activeThreadDevContainer]
  )

  // Close fork menu on outside click
  useEffect(() => {
    if (!forkState) return
    const handler = (e: MouseEvent) => {
      if (forkMenuRef.current && !forkMenuRef.current.contains(e.target as Node)) {
        setForkState(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [forkState])

  const handleFork = useCallback((sdkUuid: string) => {
    // Position near the button — use a fixed position near top-right of the panel
    setForkState({ sdkUuid, x: 0, y: 0 })
  }, [])

  const { addTab, splitPanelInTab, createLocalThread } = useProjects()

  const handleForkDestination = useCallback(async (destination: ForkDestination) => {
    if (!forkState) return
    const { sdkUuid } = forkState
    setForkState(null)

    const store = useClaudeStore.getState()

    try {
      // 1. Fork the SDK session
      const { sessionId: forkedId } = await api.forkClaudeSession(panelId, {
        upToMessageId: sdkUuid,
      })

      // 2. Load forked history
      const history = await api.getClaudeSessionHistory(forkedId)
      const msgs = mapHistoryToMessages(history)

      // 3. Create the target panel
      let newPanelId: string | undefined

      if (destination === 'tab') {
        const tabIdResult = await addTab(projectId, 'claude', 'Fork')
        if (tabIdResult) {
          // The new tab's panel is the first leaf — find it
          const appState = useAppStore.getState()
          const project = appState.projects.find((p) => p.id === projectId)
          const thread = project?.threads.find((t) => t.id === project.activeThreadId)
          const newTab = thread?.tabs.find((t) => t.id === tabIdResult)
          if (newTab?.panel.kind === 'leaf') {
            newPanelId = newTab.panel.id
          }
        }
      } else if (destination === 'split-right') {
        newPanelId = await splitPanelInTab(projectId, tabId, panelId, 'horizontal', 'claude') ?? undefined
      } else if (destination === 'split-down') {
        newPanelId = await splitPanelInTab(projectId, tabId, panelId, 'vertical', 'claude') ?? undefined
      } else if (destination === 'new-thread') {
        const threadId = await createLocalThread(projectId, 'Fork')
        if (threadId) {
          // Add a claude tab in the new thread
          const newTabId = await addTab(projectId, 'claude', 'Claude')
          if (newTabId) {
            const appState = useAppStore.getState()
            const project = appState.projects.find((p) => p.id === projectId)
            const thread = project?.threads.find((t) => t.id === threadId)
            const tab = thread?.tabs.find((t) => t.id === newTabId)
            if (tab?.panel.kind === 'leaf') {
              newPanelId = tab.panel.id
            }
          }
        }
      }

      // 4. Initialize the forked panel with session data
      if (newPanelId) {
        await api.createClaudeSession(newPanelId, config)
        await api.resumeClaudeSession(newPanelId, forkedId)
        store.loadSessionHistory(newPanelId, msgs, forkedId)
      }

      store.addMessage(panelId, {
        id: globalThis.crypto.randomUUID(),
        type: 'system',
        content: `Session forked to ${destination === 'new-thread' ? 'new thread' : destination === 'tab' ? 'new tab' : destination === 'split-right' ? 'split right' : 'split down'}`,
        ts: Date.now(),
      })
    } catch (err) {
      store.addMessage(panelId, {
        id: globalThis.crypto.randomUUID(),
        type: 'system',
        content: `Fork failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        ts: Date.now(),
      })
    }
  }, [forkState, panelId, projectId, tabId, config, addTab, splitPanelInTab, createLocalThread])

  const handleRewind = useCallback(async (sdkUuid: string) => {
    try {
      // Dry run first
      const preview = await api.rewindClaudeFiles(panelId, sdkUuid, { dryRun: true })
      if (!preview.canRewind) {
        const store = useClaudeStore.getState()
        store.addMessage(panelId, {
          id: globalThis.crypto.randomUUID(),
          type: 'system',
          content: `Cannot rewind: ${preview.error ?? 'Unknown reason'}`,
          ts: Date.now(),
        })
        return
      }

      const fileCount = preview.filesChanged?.length ?? 0
      const detail = `${fileCount} file${fileCount !== 1 ? 's' : ''} changed`
        + (preview.insertions ? `, +${preview.insertions}` : '')
        + (preview.deletions ? `, -${preview.deletions}` : '')

      const confirmed = window.confirm(`Rewind files to this point?\n\n${detail}`)
      if (!confirmed) return

      // Execute rewind
      const result = await api.rewindClaudeFiles(panelId, sdkUuid)
      const summary = `Files rewound: ${result.filesChanged?.length ?? 0} files changed`
        + (result.insertions ? `, +${result.insertions}` : '')
        + (result.deletions ? `, -${result.deletions}` : '')

      const store = useClaudeStore.getState()
      store.addMessage(panelId, {
        id: globalThis.crypto.randomUUID(),
        type: 'system',
        content: summary,
        ts: Date.now(),
      })
    } catch (err) {
      const store = useClaudeStore.getState()
      store.addMessage(panelId, {
        id: globalThis.crypto.randomUUID(),
        type: 'system',
        content: `Rewind failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        ts: Date.now(),
      })
    }
  }, [panelId])

  const FORK_DESTINATION_LABELS: Record<ForkDestination, { label: string; icon: JSX.Element }> = { // eslint-disable-line no-undef
    'tab': {
      label: 'New Tab',
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="3" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <path d="M1 5h4V3" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      ),
    },
    'split-right': {
      label: 'Split Right',
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <path d="M6 1v10" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      ),
    },
    'split-down': {
      label: 'Split Down',
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <path d="M1 6h10" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      ),
    },
    'new-thread': {
      label: 'New Thread',
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ),
    },
  }

  return (
    <div className="flex h-full flex-col bg-bg">
      <ClaudeToolbar
        config={config}
        costUsd={costUsd}
        inputTokens={inputTokens}
        outputTokens={outputTokens}
        sessionId={sessionId}
        availableModels={availableModels}
        availableEffortLevels={availableEffortLevels}
        accountInfo={accountInfo}
        fastModeState={fastModeState}
        agents={agents}
        activeTeammateCount={teamsState?.activeCount}
        totalTeammateCount={teamsState?.totalCount}
        onModelChange={handleModelChange}
        onPermissionModeChange={handlePermissionModeChange}
        onEffortChange={handleEffortChange}
        onCwdClick={changeCwd}
        onSettingsClick={toggleSettings}
        onHistoryClick={toggleHistory}
        onNewSession={newSession}
        onAgentsClick={() => setAgentsModalOpen(true)}
      />
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border-bright/50 to-transparent" />

      {teamsState && (
        <AgentTeamsPanel teamsState={teamsState} onStopTask={stopTask} />
      )}

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

      {restoreStatus === 'restoring' && (
        <div className="flex items-center gap-2 px-5 py-3 text-[12px] text-text-muted">
          <span className="inline-block h-[14px] w-[3px] rounded-full bg-accent/50 animate-[pulse_1.2s_ease-in-out_infinite]" />
          Restoring previous session...
        </div>
      )}

      {restoreStatus === 'error' && restoreError && (
        <div className="flex items-center gap-3 border-b border-error/20 bg-error/10 px-4 py-2.5">
          <span className="text-[12px] text-error">Session restore failed: {restoreError}</span>
          <button
            onClick={newSession}
            className="shrink-0 text-[11px] text-text-secondary hover:text-text"
          >
            Start fresh
          </button>
        </div>
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
          onApproveWithAnswers={approveWithAnswers}
          onDenyPermission={denyPermission}
          onAlwaysAllowPermission={alwaysAllowTool}
          onLinkClick={handleLinkClick}
          backgroundTasks={backgroundTasks}
          onStopTask={stopTask}
          onFork={handleFork}
          onRewind={handleRewind}
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
        commands={slashCommands}
      />

      {settingsOpen && (
        <ClaudeSettingsModal
          config={config}
          onSave={handleSettingsSave}
          onClose={toggleSettings}
        />
      )}

      {agentsModalOpen && (
        <AgentsModal
          agents={agents}
          onClose={() => setAgentsModalOpen(false)}
        />
      )}

      {/* Fork destination picker */}
      {forkState && (
        <div
          ref={forkMenuRef}
          className="absolute right-3 top-12 z-50 min-w-[140px] rounded-lg border border-border-bright/50 bg-bg-secondary shadow-lg shadow-black/30 backdrop-blur-md"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-text-dim">
            Fork to
          </div>
          <div className="px-1 pb-1">
            {forkDestinations.map((dest) => (
              <button
                key={dest}
                onClick={() => handleForkDestination(dest)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-text-secondary transition-colors hover:bg-bg-hover hover:text-text"
              >
                <span className="text-text-dim">{FORK_DESTINATION_LABELS[dest].icon}</span>
                {FORK_DESTINATION_LABELS[dest].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
