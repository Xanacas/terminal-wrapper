import { useEffect } from 'react'
import { api } from '~/lib/ipc'

export function useShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    const cleanups: Array<() => void> = []

    for (const [channel, handler] of Object.entries(handlers)) {
      cleanups.push(api.onShortcut(channel, handler))
    }

    // Escape key can't be a Menu accelerator — handle via keydown
    const escapeHandler = handlers['shortcut:escape']
    if (escapeHandler) {
      const onKeyDown = (e: globalThis.KeyboardEvent) => {
        if (e.key === 'Escape') escapeHandler()
      }
      window.addEventListener('keydown', onKeyDown)
      cleanups.push(() => window.removeEventListener('keydown', onKeyDown))
    }

    return () => {
      for (const cleanup of cleanups) cleanup()
    }
  }, [handlers])
}
