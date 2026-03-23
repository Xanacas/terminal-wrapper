import { create } from 'zustand'
import { api } from '~/lib/ipc'
import { useAppStore } from './app-store'

export type ContainerStatus = 'starting' | 'running' | 'stopped' | 'error' | 'destroying'

interface ContainerState {
  status: ContainerStatus
  logs: string[]
  error?: string
}

interface DevContainerStore {
  containers: Map<string, ContainerState>
  setStatus: (name: string, status: ContainerStatus, error?: string) => void
  appendLog: (name: string, line: string) => void
  remove: (name: string) => void
}

const MAX_LOGS = 200

export const useDevContainerStore = create<DevContainerStore>((set) => ({
  containers: new Map(),

  setStatus: (name, status, error) => {
    set((state) => {
      const containers = new Map(state.containers)
      const existing = containers.get(name)
      containers.set(name, {
        status,
        logs: existing?.logs ?? [],
        error,
      })
      return { containers }
    })
  },

  appendLog: (name, line) => {
    set((state) => {
      const containers = new Map(state.containers)
      const existing = containers.get(name) ?? { status: 'starting' as ContainerStatus, logs: [] }
      const logs = [...existing.logs, line].slice(-MAX_LOGS)
      containers.set(name, { ...existing, logs })
      return { containers }
    })
  },

  remove: (name) => {
    set((state) => {
      const containers = new Map(state.containers)
      containers.delete(name)
      return { containers }
    })
  },
}))

/** Subscribe to IPC events and reconcile container states on startup. Returns cleanup function. */
export function initDevContainerStore(): () => void {
  const store = useDevContainerStore.getState()

  const removeLog = api.onDevContainerLog((name, line) => {
    store.appendLog(name, line)
  })

  const removeReady = api.onDevContainerReady((name) => {
    store.setStatus(name, 'running')
  })

  const removeError = api.onDevContainerError((name, error) => {
    store.setStatus(name, 'error', error)
  })

  // Reconcile: check status of all persisted containers
  const projects = useAppStore.getState().projects
  for (const project of projects) {
    for (const thread of project.threads) {
      if (thread.devContainer) {
        const { containerName } = thread.devContainer
        api.getDevContainerStatus(containerName).then((result) => {
          if (result.status === 'running') store.setStatus(containerName, 'running')
          else if (result.status === 'stopped') store.setStatus(containerName, 'stopped')
          else store.setStatus(containerName, 'error', 'Container not found')
        })
      }
    }
  }

  return () => {
    removeLog()
    removeReady()
    removeError()
  }
}
