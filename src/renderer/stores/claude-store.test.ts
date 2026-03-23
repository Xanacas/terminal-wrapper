import { describe, it, expect, beforeEach } from 'vitest'
import { useClaudeStore } from './claude-store'

beforeEach(() => {
  // Reset the store between tests
  useClaudeStore.setState({ panels: new Map() })
})

describe('setRestoreStatus', () => {
  it('sets restoreStatus to restoring', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.setRestoreStatus('panel-1', 'restoring')

    const panel = store.getPanel('panel-1')
    expect(panel.restoreStatus).toBe('restoring')
    expect(panel.restoreError).toBeUndefined()
  })

  it('sets restoreStatus to restored', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.setRestoreStatus('panel-1', 'restored')

    expect(store.getPanel('panel-1').restoreStatus).toBe('restored')
  })

  it('sets restoreStatus to error with error message', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.setRestoreStatus('panel-1', 'error', 'Session not found')

    const panel = store.getPanel('panel-1')
    expect(panel.restoreStatus).toBe('error')
    expect(panel.restoreError).toBe('Session not found')
  })

  it('defaults restoreStatus to none on init', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')

    expect(store.getPanel('panel-1').restoreStatus).toBe('none')
  })

  it('clears error when status changes from error to restoring', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.setRestoreStatus('panel-1', 'error', 'Something failed')
    store.setRestoreStatus('panel-1', 'restoring')

    const panel = store.getPanel('panel-1')
    expect(panel.restoreStatus).toBe('restoring')
    expect(panel.restoreError).toBeUndefined()
  })
})

describe('clearSession preserves restoreStatus', () => {
  it('does not reset restoreStatus on clearSession (partial update)', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.setRestoreStatus('panel-1', 'restored')
    store.clearSession('panel-1')

    const panel = store.getPanel('panel-1')
    // clearSession does a partial update — restoreStatus is not explicitly reset
    expect(panel.restoreStatus).toBe('restored')
  })
})

describe('loadSessionHistory with restoreStatus', () => {
  it('loadSessionHistory sets messages and sessionId', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')

    const messages = [
      { id: 'msg-1', type: 'user' as const, content: 'Hello', ts: Date.now() },
      { id: 'msg-2', type: 'assistant' as const, content: 'Hi there', ts: Date.now() },
    ]

    store.loadSessionHistory('panel-1', messages, 'session-abc')

    const panel = store.getPanel('panel-1')
    expect(panel.messages).toHaveLength(2)
    expect(panel.sessionId).toBe('session-abc')
    expect(panel.isStreaming).toBe(false)
    expect(panel.pendingPermissions).toEqual([])
  })
})

describe('independent panel restore tracking', () => {
  it('tracks restoreStatus independently per panel', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-a')
    store.initPanel('panel-b')

    store.setRestoreStatus('panel-a', 'restoring')
    store.setRestoreStatus('panel-b', 'error', 'Failed')

    expect(store.getPanel('panel-a').restoreStatus).toBe('restoring')
    expect(store.getPanel('panel-b').restoreStatus).toBe('error')
    expect(store.getPanel('panel-b').restoreError).toBe('Failed')
  })
})
