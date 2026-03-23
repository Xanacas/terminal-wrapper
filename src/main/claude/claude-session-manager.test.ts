import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock electron before importing the module
vi.mock('electron', () => ({
  app: {
    getAppPath: () => '/fake/app',
    isPackaged: false,
  },
}))

// Mock the SDK — all exports needed by claude-session-manager
const mockSDK = {
  forkSession: vi.fn(),
  query: vi.fn(() => (async function* () {})()),
  listSessions: vi.fn().mockResolvedValue([]),
  getSessionMessages: vi.fn().mockResolvedValue([]),
}
vi.mock('@anthropic-ai/claude-agent-sdk', () => mockSDK)

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
  stopBackgroundTask,
  fetchInitializationResult,
  forkSessionFromPanel,
  rewindFilesInSession,
  _testGetSession,
  _testResetSDKCache,
  _testSetSDK,
} from './claude-session-manager'

beforeEach(() => {
  destroyAll()
  _testResetSDKCache()
  // Inject mock SDK so source-file dynamic imports use it
  _testSetSDK(mockSDK as never)
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

describe('fetchInitializationResult', () => {
  it('returns data from query.initializationResult()', async () => {
    const mockData = {
      models: [{ value: 'sonnet', displayName: 'Claude Sonnet 4.6', description: 'Fast' }],
      commands: [{ name: 'help', description: 'Show help', argumentHint: '' }],
      agents: [{ name: 'Explore', description: 'Explore code' }],
      account: { email: 'test@example.com' },
      output_style: 'text',
      available_output_styles: ['text', 'json'],
      fast_mode_state: 'off',
    }
    const mockQuery = {
      initializationResult: () => Promise.resolve(mockData),
    }

    const result = await fetchInitializationResult(mockQuery as never)
    expect(result).not.toBeNull()
    expect(result!.models).toHaveLength(1)
    expect(result!.models[0].value).toBe('sonnet')
    expect(result!.commands[0].name).toBe('help')
    expect(result!.account.email).toBe('test@example.com')
  })

  it('returns null when initializationResult() throws', async () => {
    const mockQuery = {
      initializationResult: () => Promise.reject(new Error('not ready')),
    }

    const result = await fetchInitializationResult(mockQuery as never)
    expect(result).toBeNull()
  })

  it('returns null when initializationResult() returns undefined', async () => {
    const mockQuery = {
      initializationResult: () => Promise.resolve(undefined),
    }

    const result = await fetchInitializationResult(mockQuery as never)
    expect(result).toBeNull()
  })
})

describe('stopBackgroundTask', () => {
  it('returns false for non-existent panel', async () => {
    const result = await stopBackgroundTask('unknown-panel', 'task-1')
    expect(result).toBe(false)
  })

  it('returns false when no active query', async () => {
    await createSession('panel-1', { cwd: '/tmp' })
    const result = await stopBackgroundTask('panel-1', 'task-1')
    expect(result).toBe(false)
  })
})

// ---- Cycle 3: forkSessionFromPanel ----

describe('forkSessionFromPanel', () => {
  beforeEach(() => {
    mockSDK.forkSession.mockReset()
  })

  it('throws if session does not exist', async () => {
    await expect(forkSessionFromPanel('nonexistent')).rejects.toThrow('No session for panel nonexistent')
  })

  it('throws if session has no sdkSessionId', async () => {
    await createSession('panel-1', { cwd: '/tmp' })
    await expect(forkSessionFromPanel('panel-1')).rejects.toThrow('has no SDK session ID')
  })

  it('calls sdk.forkSession with correct args', async () => {
    await createSession('panel-1', { cwd: '/my/project' })
    resumeSession('panel-1', 'sdk-session-abc')

    mockSDK.forkSession.mockResolvedValue({ sessionId: 'forked-session-123' })

    await forkSessionFromPanel('panel-1', {
      upToMessageId: 'msg-uuid-5',
      title: 'My Fork',
    })

    expect(mockSDK.forkSession).toHaveBeenCalledWith('sdk-session-abc', {
      dir: '/my/project',
      upToMessageId: 'msg-uuid-5',
      title: 'My Fork',
    })
  })

  it('returns { sessionId } from SDK result', async () => {
    await createSession('panel-1', { cwd: '/tmp' })
    resumeSession('panel-1', 'sdk-session-abc')

    mockSDK.forkSession.mockResolvedValue({ sessionId: 'forked-session-456' })

    const result = await forkSessionFromPanel('panel-1')
    expect(result).toEqual({ sessionId: 'forked-session-456' })
  })
})

// ---- Cycle 4: rewindFilesInSession ----

describe('rewindFilesInSession', () => {
  it('throws if session does not exist', async () => {
    await expect(rewindFilesInSession('nonexistent', 'msg-1')).rejects.toThrow('No session for panel nonexistent')
  })

  it('throws if no active query', async () => {
    await createSession('panel-1', { cwd: '/tmp' })
    await expect(rewindFilesInSession('panel-1', 'msg-1')).rejects.toThrow('No active query for panel panel-1')
  })

  it('throws if query has no rewindFiles method', async () => {
    await createSession('panel-1', { cwd: '/tmp' })
    // Manually set an activeQuery without rewindFiles
    const session = _testGetSession('panel-1')!
    session.activeQuery = { interrupt: vi.fn().mockResolvedValue(undefined), streamInput: vi.fn(), stopTask: vi.fn(), initializationResult: vi.fn() } as never

    await expect(rewindFilesInSession('panel-1', 'msg-1')).rejects.toThrow('rewindFiles not available')
  })

  it('calls query.rewindFiles with userMessageId and dryRun', async () => {
    await createSession('panel-1', { cwd: '/tmp' })
    const mockRewindFiles = vi.fn().mockResolvedValue({
      canRewind: true,
      filesChanged: ['file1.ts', 'file2.ts'],
      insertions: 10,
      deletions: 5,
    })
    const session = _testGetSession('panel-1')!
    session.activeQuery = {
      interrupt: vi.fn().mockResolvedValue(undefined),
      streamInput: vi.fn(),
      stopTask: vi.fn(),
      initializationResult: vi.fn(),
      rewindFiles: mockRewindFiles,
    } as never

    const result = await rewindFilesInSession('panel-1', 'user-msg-uuid', { dryRun: true })

    expect(mockRewindFiles).toHaveBeenCalledWith('user-msg-uuid', { dryRun: true })
    expect(result).toEqual({
      canRewind: true,
      filesChanged: ['file1.ts', 'file2.ts'],
      insertions: 10,
      deletions: 5,
    })
  })

  it('returns RewindFilesResult from SDK', async () => {
    await createSession('panel-1', { cwd: '/tmp' })
    const mockRewindFiles = vi.fn().mockResolvedValue({
      canRewind: false,
      error: 'No checkpoint available',
    })
    const session = _testGetSession('panel-1')!
    session.activeQuery = {
      interrupt: vi.fn().mockResolvedValue(undefined),
      streamInput: vi.fn(),
      stopTask: vi.fn(),
      initializationResult: vi.fn(),
      rewindFiles: mockRewindFiles,
    } as never

    const result = await rewindFilesInSession('panel-1', 'msg-1')
    expect(result.canRewind).toBe(false)
    expect(result.error).toBe('No checkpoint available')
  })
})
