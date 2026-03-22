import { create } from 'zustand'

interface UIStore {
  focusedPanelId: string | null
  commandPaletteOpen: boolean
  projectSwitcherOpen: boolean
  projectSettingsId: string | null
  projectOverviewId: string | null
  commandEditorOpen: boolean
  commandEditorProjectId: string | null
  commandEditorCommandId: string | null
  // "projectId:threadId" keys, most-recently-focused first
  threadFocusOrder: string[]

  setFocusedPanel: (id: string | null) => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
  openProjectSwitcher: () => void
  closeProjectSwitcher: () => void
  openProjectSettings: (projectId: string) => void
  closeProjectSettings: () => void
  openProjectOverview: (projectId: string) => void
  closeProjectOverview: () => void
  toggleProjectOverview: (projectId: string) => void
  openCommandEditor: (projectId: string | null, commandId?: string | null) => void
  closeCommandEditor: () => void
  closeAllOverlays: () => void
  recordThreadFocus: (projectId: string, threadId: string) => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  focusedPanelId: null,
  commandPaletteOpen: false,
  projectSwitcherOpen: false,
  projectSettingsId: null,
  projectOverviewId: null,
  commandEditorOpen: false,
  commandEditorProjectId: null,
  commandEditorCommandId: null,
  threadFocusOrder: [],

  setFocusedPanel: (id) => set({ focusedPanelId: id }),

  openCommandPalette: () =>
    set({ commandPaletteOpen: true, projectSwitcherOpen: false, projectSettingsId: null }),

  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  openProjectSwitcher: () =>
    set({ projectSwitcherOpen: true, commandPaletteOpen: false, projectSettingsId: null }),

  closeProjectSwitcher: () => set({ projectSwitcherOpen: false }),

  openProjectSettings: (projectId) =>
    set({ projectSettingsId: projectId, commandPaletteOpen: false, projectSwitcherOpen: false }),

  closeProjectSettings: () => set({ projectSettingsId: null }),

  openProjectOverview: (projectId) => set({ projectOverviewId: projectId }),

  closeProjectOverview: () => set({ projectOverviewId: null }),

  toggleProjectOverview: (projectId) => {
    const current = get().projectOverviewId
    set({ projectOverviewId: current === projectId ? null : projectId })
  },

  openCommandEditor: (projectId, commandId) =>
    set({ commandEditorOpen: true, commandEditorProjectId: projectId ?? null, commandEditorCommandId: commandId ?? null }),

  closeCommandEditor: () =>
    set({ commandEditorOpen: false, commandEditorProjectId: null, commandEditorCommandId: null }),

  closeAllOverlays: () =>
    set({ commandPaletteOpen: false, projectSwitcherOpen: false, projectSettingsId: null, projectOverviewId: null, commandEditorOpen: false, commandEditorProjectId: null, commandEditorCommandId: null }),

  recordThreadFocus: (projectId, threadId) => {
    const key = `${projectId}:${threadId}`
    set((s) => ({ threadFocusOrder: [key, ...s.threadFocusOrder.filter((k) => k !== key)] }))
  }
}))
