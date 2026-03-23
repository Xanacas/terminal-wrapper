import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock electron before importing the module
vi.mock('electron', () => ({
  app: {
    getAppPath: () => '/fake/app',
    isPackaged: false,
  },
}))

// Mock the logger
vi.mock('../logger', () => ({
  registerPanelContext: vi.fn(),
  unregisterPanelContext: vi.fn(),
  logSessionCreated: vi.fn(),
  logUserMessage: vi.fn(),
  logAssistantText: vi.fn(),
  logToolUse: vi.fn(),
  logToolResult: vi.fn(),
  logPermissionRequest: vi.fn(),
  logPermissionResponse: vi.fn(),
  logSessionMeta: vi.fn(),
  logSessionEnded: vi.fn(),
}))

import {
  createSession,
  getSessionState,
  getAllSessionIds,
  resumeSession,
  destroySession,
  destroyAll,
} from './claude-session-manager'

beforeEach(() => {
  destroyAll()
})

describe('getSessionState', () => {
  it('returns null for non-existent panel', () => {
    expect(getSessionState('unknown-panel')).toBeNull()
  })

  it('returns session state after createSession', async () => {
    await createSession('panel-1', { cwd: '/tmp' })

    const state = getSessionState('panel-1')
    expect(state).not.toBeNull()
    expect(state!.sdkSessionId).toBeNull()
    expect(state!.costUsd).toBe(0)
    expect(state!.inputTokens).toBe(0)
    expect(state!.outputTokens).toBe(0)
    expect(state!.model).toBe('sonnet')
    expect(state!.permissionMode).toBe('default')
    expect(state!.isActive).toBe(false)
  })

  it('returns updated sdkSessionId after resumeSession', async () => {
    await createSession('panel-1', { cwd: '/tmp' })
    resumeSession('panel-1', 'sdk-session-123')

    const state = getSessionState('panel-1')
    expect(state!.sdkSessionId).toBe('sdk-session-123')
  })

  it('reflects custom model and permissionMode', async () => {
    await createSession('panel-1', {
      cwd: '/tmp',
      model: 'opus',
      permissionMode: 'bypassPermissions',
    })

    const state = getSessionState('panel-1')
    expect(state!.model).toBe('opus')
    expect(state!.permissionMode).toBe('bypassPermissions')
  })

  it('returns null after session is destroyed', async () => {
    await createSession('panel-1', { cwd: '/tmp' })
    destroySession('panel-1')

    expect(getSessionState('panel-1')).toBeNull()
  })
})

describe('getAllSessionIds', () => {
  it('returns empty array when no sessions exist', () => {
    expect(getAllSessionIds()).toEqual([])
  })

  it('returns empty array when sessions have no sdkSessionId', async () => {
    await createSession('panel-1', { cwd: '/tmp' })
    await createSession('panel-2', { cwd: '/tmp' })

    // Sessions exist but sdkSessionId is undefined (no query run yet)
    expect(getAllSessionIds()).toEqual([])
  })

  it('returns sessions that have sdkSessionId set', async () => {
    await createSession('panel-1', { cwd: '/tmp' })
    await createSession('panel-2', { cwd: '/tmp' })
    await createSession('panel-3', { cwd: '/tmp' })

    resumeSession('panel-1', 'sdk-1')
    resumeSession('panel-3', 'sdk-3')

    const result = getAllSessionIds()
    expect(result).toHaveLength(2)
    expect(result).toContainEqual({ panelId: 'panel-1', sdkSessionId: 'sdk-1' })
    expect(result).toContainEqual({ panelId: 'panel-3', sdkSessionId: 'sdk-3' })
  })

  it('excludes destroyed sessions', async () => {
    await createSession('panel-1', { cwd: '/tmp' })
    await createSession('panel-2', { cwd: '/tmp' })
    resumeSession('panel-1', 'sdk-1')
    resumeSession('panel-2', 'sdk-2')

    destroySession('panel-1')

    const result = getAllSessionIds()
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ panelId: 'panel-2', sdkSessionId: 'sdk-2' })
  })
})
