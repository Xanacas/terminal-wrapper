// ---- Panel tree types ----

export type PanelType = 'terminal' | 'browser' | 'claude' | 'todo' | 'empty' | 'commands'

export interface LeafPanel {
  id: string
  kind: 'leaf'
  panelType: PanelType
  shellId?: string
  url?: string
  claudeSessionId?: string
  initialCommand?: string
}

export interface SplitPanel {
  id: string
  kind: 'split'
  direction: 'horizontal' | 'vertical'
  ratio: number
  first: Panel
  second: Panel
}

export type Panel = LeafPanel | SplitPanel

export interface Tab {
  id: string
  name: string
  panel: Panel
}

// ---- Helpers ----

export function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export function createLeafPanel(
  panelType: PanelType,
  opts?: { shellId?: string; url?: string; initialCommand?: string }
): LeafPanel {
  return {
    id: generateId(),
    kind: 'leaf',
    panelType,
    shellId: opts?.shellId,
    url: opts?.url ?? 'https://google.com',
    initialCommand: opts?.initialCommand
  }
}

export function createTab(name: string, panel: Panel): Tab {
  return { id: generateId(), name, panel }
}

// ---- Tree queries ----

export function findPanel(root: Panel, id: string): Panel | null {
  if (root.id === id) return root
  if (root.kind === 'split') {
    return findPanel(root.first, id) ?? findPanel(root.second, id)
  }
  return null
}

export function collectLeafPanels(root: Panel): LeafPanel[] {
  if (root.kind === 'leaf') return [root]
  return [...collectLeafPanels(root.first), ...collectLeafPanels(root.second)]
}

export function collectLeafIds(root: Panel): string[] {
  return collectLeafPanels(root).map((p) => p.id)
}

export function firstLeafId(root: Panel): string {
  if (root.kind === 'leaf') return root.id
  return firstLeafId(root.first)
}

// ---- Tree mutations (immutable, return new tree) ----

export function splitPanel(
  root: Panel,
  panelId: string,
  direction: 'horizontal' | 'vertical',
  newPanel: LeafPanel
): Panel {
  if (root.id === panelId) {
    return {
      id: generateId(),
      kind: 'split',
      direction,
      ratio: 0.5,
      first: root,
      second: newPanel
    }
  }
  if (root.kind === 'split') {
    return {
      ...root,
      first: splitPanel(root.first, panelId, direction, newPanel),
      second: splitPanel(root.second, panelId, direction, newPanel)
    }
  }
  return root
}

export function removePanel(root: Panel, panelId: string): Panel | null {
  if (root.kind === 'leaf') {
    return root.id === panelId ? null : root
  }
  // Direct children
  if (root.first.id === panelId) return root.second
  if (root.second.id === panelId) return root.first
  // Recurse
  const newFirst = removePanel(root.first, panelId)
  if (newFirst !== root.first) {
    return newFirst ? { ...root, first: newFirst } : root.second
  }
  const newSecond = removePanel(root.second, panelId)
  if (newSecond !== root.second) {
    return newSecond ? { ...root, second: newSecond } : root.first
  }
  return root
}

export function updateLeafInTree(
  root: Panel,
  panelId: string,
  updates: Partial<LeafPanel>
): Panel {
  if (root.id === panelId && root.kind === 'leaf') {
    return { ...root, ...updates, id: root.id, kind: 'leaf' }
  }
  if (root.kind === 'split') {
    return {
      ...root,
      first: updateLeafInTree(root.first, panelId, updates),
      second: updateLeafInTree(root.second, panelId, updates)
    }
  }
  return root
}

export function updateSplitRatio(root: Panel, splitId: string, ratio: number): Panel {
  if (root.id === splitId && root.kind === 'split') {
    return { ...root, ratio }
  }
  if (root.kind === 'split') {
    return {
      ...root,
      first: updateSplitRatio(root.first, splitId, ratio),
      second: updateSplitRatio(root.second, splitId, ratio)
    }
  }
  return root
}

export function deepClonePanel(panel: Panel): Panel {
  if (panel.kind === 'leaf') {
    return { ...panel, id: generateId() }
  }
  return {
    ...panel,
    id: generateId(),
    first: deepClonePanel(panel.first),
    second: deepClonePanel(panel.second)
  }
}

export function deepCloneTab(tab: Tab): Tab {
  return {
    id: generateId(),
    name: tab.name,
    panel: deepClonePanel(tab.panel)
  }
}
