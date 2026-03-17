import { useCallback } from 'react'
import type { Panel, LeafPanel } from '~/lib/panel-utils'
import { useUIStore } from '~/stores/ui-store'
import { TerminalView } from '~/components/terminal/terminal-view'
import { BrowserView } from '~/components/browser/browser-view'
import { ClaudeView } from '~/components/claude/claude-view'
import { TodoView } from '~/components/todo/todo-view'
import { PanelChooser } from './panel-chooser'
import { SplitView } from './split-view'

interface PanelContainerProps {
  panel: Panel
  projectId: string
  tabId: string
  threadId: string
  cwd: string
  defaultShellId: string
  active: boolean
  onSplitRatioChange: (splitId: string, ratio: number) => void
  onSetPanelType: (panelId: string, type: 'terminal' | 'browser' | 'claude' | 'todo') => void
  onUrlChange: (panelId: string, url: string) => void
  onOpenUrl?: (panelId: string, url: string) => void
}

function LeafPanelView({
  leaf,
  projectId,
  threadId,
  cwd,
  defaultShellId,
  active,
  onSetPanelType,
  onUrlChange,
  onOpenUrl
}: {
  leaf: LeafPanel
  projectId: string
  threadId: string
  cwd: string
  defaultShellId: string
  active: boolean
  onSetPanelType: (panelId: string, type: 'terminal' | 'browser' | 'claude' | 'todo') => void
  onUrlChange: (panelId: string, url: string) => void
  onOpenUrl?: (panelId: string, url: string) => void
}) {
  const setFocusedPanel = useUIStore((s) => s.setFocusedPanel)
  const focusedPanelId = useUIStore((s) => s.focusedPanelId)
  const isFocused = focusedPanelId === leaf.id

  const handleFocus = useCallback(() => {
    setFocusedPanel(leaf.id)
  }, [leaf.id, setFocusedPanel])

  return (
    <div
      className={`relative h-full w-full overflow-hidden transition-shadow duration-150 ${
        isFocused && active ? 'shadow-[inset_0_0_0_1px_rgba(129,140,248,0.15)]' : ''
      }`}
      onMouseDown={handleFocus}
      onFocus={handleFocus}
    >
      {leaf.panelType === 'terminal' && (
        <TerminalView
          projectId={leaf.id}
          shellId={leaf.shellId ?? defaultShellId}
          cwd={cwd}
          onOpenUrl={onOpenUrl ? (url) => onOpenUrl(leaf.id, url) : undefined}
        />
      )}
      {leaf.panelType === 'browser' && (
        <BrowserView
          projectId={leaf.id}
          url={leaf.url ?? 'https://google.com'}
          visible={active}
          onUrlChange={(url) => onUrlChange(leaf.id, url)}
        />
      )}
      {leaf.panelType === 'claude' && (
        <ClaudeView
          panelId={leaf.id}
          cwd={cwd}
          onOpenUrl={onOpenUrl ? (url) => onOpenUrl(leaf.id, url) : undefined}
        />
      )}
      {leaf.panelType === 'todo' && (
        <TodoView projectId={projectId} threadId={threadId} />
      )}
      {leaf.panelType === 'empty' && (
        <PanelChooser onChoose={(type) => onSetPanelType(leaf.id, type)} />
      )}
    </div>
  )
}

export function PanelContainer({
  panel,
  projectId,
  tabId,
  threadId,
  cwd,
  defaultShellId,
  active,
  onSplitRatioChange,
  onSetPanelType,
  onUrlChange,
  onOpenUrl
}: PanelContainerProps) {
  if (panel.kind === 'split') {
    return (
      <SplitView
        direction={panel.direction}
        ratio={panel.ratio}
        onRatioChange={(ratio) => onSplitRatioChange(panel.id, ratio)}
        first={
          <PanelContainer
            panel={panel.first}
            projectId={projectId}
            tabId={tabId}
            threadId={threadId}
            cwd={cwd}
            defaultShellId={defaultShellId}
            active={active}
            onSplitRatioChange={onSplitRatioChange}
            onSetPanelType={onSetPanelType}
            onUrlChange={onUrlChange}
            onOpenUrl={onOpenUrl}
          />
        }
        second={
          <PanelContainer
            panel={panel.second}
            projectId={projectId}
            tabId={tabId}
            threadId={threadId}
            cwd={cwd}
            defaultShellId={defaultShellId}
            active={active}
            onSplitRatioChange={onSplitRatioChange}
            onSetPanelType={onSetPanelType}
            onUrlChange={onUrlChange}
            onOpenUrl={onOpenUrl}
          />
        }
      />
    )
  }

  return (
    <LeafPanelView
      leaf={panel}
      projectId={projectId}
      threadId={threadId}
      cwd={cwd}
      defaultShellId={defaultShellId}
      active={active}
      onSetPanelType={onSetPanelType}
      onUrlChange={onUrlChange}
      onOpenUrl={onOpenUrl}
    />
  )
}
