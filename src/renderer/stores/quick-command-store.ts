import { create } from 'zustand'

interface PopoverInstance {
  id: string
  commandId: string
  commandStr: string
  cwd: string
  shellId: string
  status: 'running' | 'exited'
  exitCode: number | null
  autoDismiss: boolean
}

interface QuickCommandStore {
  popovers: PopoverInstance[]

  openPopover: (instance: Omit<PopoverInstance, 'status' | 'exitCode'>) => void
  closePopover: (id: string) => void
  setPopoverStatus: (id: string, status: 'running' | 'exited', exitCode?: number) => void
}

export const useQuickCommandStore = create<QuickCommandStore>((set) => ({
  popovers: [],

  openPopover: (instance) =>
    set((s) => ({
      popovers: [...s.popovers, { ...instance, status: 'running', exitCode: null }]
    })),

  closePopover: (id) =>
    set((s) => ({
      popovers: s.popovers.filter((p) => p.id !== id)
    })),

  setPopoverStatus: (id, status, exitCode) =>
    set((s) => ({
      popovers: s.popovers.map((p) =>
        p.id === id ? { ...p, status, exitCode: exitCode ?? p.exitCode } : p
      )
    })),
}))
