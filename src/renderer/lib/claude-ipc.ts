import { api } from '~/lib/ipc'

type Callback = (panelId: string, msg: unknown) => void

const subscribers = {
  message: new Map<string, Callback>(),
  permission: new Map<string, Callback>(),
  ended: new Map<string, Callback>(),
  error: new Map<string, Callback>(),
}

// Register global IPC listeners exactly once
api.onClaudeMessage((panelId, msg) => {
  subscribers.message.get(panelId)?.(panelId, msg)
})

api.onClaudePermissionRequest((panelId, msg) => {
  subscribers.permission.get(panelId)?.(panelId, msg)
})

api.onClaudeSessionEnded((panelId, msg) => {
  subscribers.ended.get(panelId)?.(panelId, msg)
})

api.onClaudeError((panelId, msg) => {
  subscribers.error.get(panelId)?.(panelId, msg)
})

export function subscribeClaudePanel(
  panelId: string,
  handlers: {
    onMessage: Callback
    onPermission: Callback
    onEnded: Callback
    onError: Callback
  }
) {
  subscribers.message.set(panelId, handlers.onMessage)
  subscribers.permission.set(panelId, handlers.onPermission)
  subscribers.ended.set(panelId, handlers.onEnded)
  subscribers.error.set(panelId, handlers.onError)

  return () => {
    subscribers.message.delete(panelId)
    subscribers.permission.delete(panelId)
    subscribers.ended.delete(panelId)
    subscribers.error.delete(panelId)
  }
}
