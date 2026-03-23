import { describe, it, expect, beforeEach } from 'vitest'
import { useClaudeStore, getModelsForPanel, getEffortLevelsForModel, getSlashCommandsForPanel, getAccountInfoForPanel, getFastModeStateForPanel, getAgentsForPanel, getAnyInitResult } from './claude-store'
import type { BackgroundTask } from './claude-store'
import type { InitializationResult } from '../../main/claude/types'

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

// ---- Background Tasks ----

describe('backgroundTasks — startTask', () => {
  it('adds task to backgroundTasks map with status running', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.startTask('panel-1', {
      taskId: 'task-1',
      description: 'Running tests',
      ts: 1000,
    })

    const panel = store.getPanel('panel-1')
    const task = panel.backgroundTasks.get('task-1')
    expect(task).toBeDefined()
    expect(task!.status).toBe('running')
    expect(task!.description).toBe('Running tests')
    expect(task!.startedAt).toBe(1000)
  })

  it('second startTask with same id overwrites', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.startTask('panel-1', { taskId: 'task-1', description: 'First', ts: 1000 })
    store.startTask('panel-1', { taskId: 'task-1', description: 'Second', ts: 2000 })

    const task = store.getPanel('panel-1').backgroundTasks.get('task-1')
    expect(task!.description).toBe('Second')
    expect(task!.startedAt).toBe(2000)
  })

  it('accepts optional fields', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.startTask('panel-1', {
      taskId: 'task-1',
      description: 'Running tests',
      taskType: 'background',
      prompt: 'Run all tests',
      toolUseId: 'tool-123',
      ts: 1000,
    })

    const task = store.getPanel('panel-1').backgroundTasks.get('task-1')
    expect(task!.taskType).toBe('background')
    expect(task!.prompt).toBe('Run all tests')
    expect(task!.toolUseId).toBe('tool-123')
  })
})

describe('backgroundTasks — updateTaskProgress', () => {
  it('updates summary, lastToolName, usage, description', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.startTask('panel-1', { taskId: 'task-1', description: 'Building', ts: 1000 })
    store.updateTaskProgress('panel-1', 'task-1', {
      description: 'Analyzing files',
      summary: 'Reading config files',
      lastToolName: 'Read',
      usage: { totalTokens: 1200, toolUses: 5, durationMs: 12000 },
    })

    const task = store.getPanel('panel-1').backgroundTasks.get('task-1')
    expect(task!.description).toBe('Analyzing files')
    expect(task!.summary).toBe('Reading config files')
    expect(task!.lastToolName).toBe('Read')
    expect(task!.usage).toEqual({ totalTokens: 1200, toolUses: 5, durationMs: 12000 })
  })

  it('is no-op for unknown taskId', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    // Should not throw
    store.updateTaskProgress('panel-1', 'unknown-task', {
      description: 'test',
      summary: 'test',
    })
    expect(store.getPanel('panel-1').backgroundTasks.size).toBe(0)
  })
})

describe('backgroundTasks — completeTask', () => {
  it('sets status to completed with summary and outputFile', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.startTask('panel-1', { taskId: 'task-1', description: 'Tests', ts: 1000 })
    store.completeTask('panel-1', 'task-1', {
      status: 'completed',
      summary: 'All tests passed',
      outputFile: '/tmp/output.json',
    })

    const task = store.getPanel('panel-1').backgroundTasks.get('task-1')
    expect(task!.status).toBe('completed')
    expect(task!.summary).toBe('All tests passed')
    expect(task!.outputFile).toBe('/tmp/output.json')
    expect(task!.completedAt).toBeGreaterThan(0)
  })

  it('sets status to failed', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.startTask('panel-1', { taskId: 'task-1', description: 'Build', ts: 1000 })
    store.completeTask('panel-1', 'task-1', {
      status: 'failed',
      summary: 'Build error',
    })

    expect(store.getPanel('panel-1').backgroundTasks.get('task-1')!.status).toBe('failed')
  })

  it('sets status to stopped', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.startTask('panel-1', { taskId: 'task-1', description: 'Build', ts: 1000 })
    store.completeTask('panel-1', 'task-1', {
      status: 'stopped',
      summary: 'User cancelled',
    })

    expect(store.getPanel('panel-1').backgroundTasks.get('task-1')!.status).toBe('stopped')
  })

  it('is no-op for unknown taskId', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.completeTask('panel-1', 'unknown', {
      status: 'completed',
      summary: 'Done',
    })
    expect(store.getPanel('panel-1').backgroundTasks.size).toBe(0)
  })
})

describe('backgroundTasks — clearSession', () => {
  it('clears backgroundTasks map', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.startTask('panel-1', { taskId: 'task-1', description: 'A', ts: 1000 })
    store.startTask('panel-1', { taskId: 'task-2', description: 'B', ts: 2000 })

    store.clearSession('panel-1')

    expect(store.getPanel('panel-1').backgroundTasks.size).toBe(0)
  })
})

describe('backgroundTasks — multiple concurrent tasks', () => {
  it('manages 3 tasks with independent state', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.startTask('panel-1', { taskId: 'task-1', description: 'Tests', ts: 1000 })
    store.startTask('panel-1', { taskId: 'task-2', description: 'Build', ts: 2000 })
    store.startTask('panel-1', { taskId: 'task-3', description: 'Lint', ts: 3000 })

    expect(store.getPanel('panel-1').backgroundTasks.size).toBe(3)

    store.updateTaskProgress('panel-1', 'task-1', { description: 'Tests', summary: '3/10 passed' })
    store.completeTask('panel-1', 'task-2', { status: 'completed', summary: 'Build OK' })

    const tasks = store.getPanel('panel-1').backgroundTasks
    expect(tasks.get('task-1')!.status).toBe('running')
    expect(tasks.get('task-1')!.summary).toBe('3/10 passed')
    expect(tasks.get('task-2')!.status).toBe('completed')
    expect(tasks.get('task-3')!.status).toBe('running')
  })
})

// ---- Initialization Result ----

const mockInitResult: InitializationResult = {
  models: [
    { value: 'sonnet', displayName: 'Claude Sonnet 4.6', description: 'Fast and capable', supportsEffort: true, supportedEffortLevels: ['low', 'medium', 'high', 'max'] },
    { value: 'opus', displayName: 'Claude Opus 4.6', description: 'Most capable', supportsEffort: true, supportedEffortLevels: ['medium', 'high', 'max'] },
    { value: 'haiku', displayName: 'Claude Haiku 4.5', description: 'Fast and cheap', supportsEffort: false },
  ],
  commands: [
    { name: 'help', description: 'Show help', argumentHint: '' },
    { name: 'compact', description: 'Compact conversation', argumentHint: '' },
    { name: 'config', description: 'View/edit config', argumentHint: '<key> [value]' },
  ],
  agents: [
    { name: 'Explore', description: 'Fast codebase exploration', model: 'haiku' },
    { name: 'Plan', description: 'Architecture planning', model: 'opus' },
  ],
  account: { email: 'dev@example.com', organization: 'Acme Corp', subscriptionType: 'Pro' },
  output_style: 'text',
  available_output_styles: ['text', 'json'],
  fast_mode_state: 'on',
}

describe('setInitResult', () => {
  it('stores initResult on the panel state', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.setInitResult('panel-1', mockInitResult)

    expect(store.getPanel('panel-1').initResult).toEqual(mockInitResult)
  })

  it('defaults initResult to null on panel init', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')

    expect(store.getPanel('panel-1').initResult).toBeNull()
  })

  it('clearSession preserves initResult', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.setInitResult('panel-1', mockInitResult)
    store.clearSession('panel-1')

    expect(store.getPanel('panel-1').initResult).toEqual(mockInitResult)
  })

  it('stores independently per panel', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-a')
    store.initPanel('panel-b')

    const otherInit = { ...mockInitResult, account: { email: 'other@example.com' } }
    store.setInitResult('panel-a', mockInitResult)
    store.setInitResult('panel-b', otherInit)

    expect(store.getPanel('panel-a').initResult!.account.email).toBe('dev@example.com')
    expect(store.getPanel('panel-b').initResult!.account.email).toBe('other@example.com')
  })
})

describe('getModelsForPanel', () => {
  it('returns hardcoded fallback when initResult is null', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')

    const models = getModelsForPanel(store.getPanel('panel-1'))
    expect(models).toHaveLength(3)
    expect(models[0].value).toBe('sonnet')
    expect(models[0].displayName).toBe('Sonnet')
    expect(models[1].value).toBe('opus')
    expect(models[2].value).toBe('haiku')
  })

  it('returns initResult.models when available', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.setInitResult('panel-1', mockInitResult)

    const models = getModelsForPanel(store.getPanel('panel-1'))
    expect(models).toHaveLength(3)
    expect(models[0].displayName).toBe('Claude Sonnet 4.6')
    expect(models[1].displayName).toBe('Claude Opus 4.6')
  })
})

describe('getEffortLevelsForModel', () => {
  it('returns all effort levels when initResult is null', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')

    const levels = getEffortLevelsForModel(store.getPanel('panel-1'))
    expect(levels).toEqual(['low', 'medium', 'high', 'max'])
  })

  it('returns all effort levels when selected model has no supportsEffort flag', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.setInitResult('panel-1', {
      ...mockInitResult,
      models: [{ value: 'sonnet', displayName: 'Sonnet', description: '' }],
    })

    const levels = getEffortLevelsForModel(store.getPanel('panel-1'))
    expect(levels).toEqual(['low', 'medium', 'high', 'max'])
  })

  it('returns supportedEffortLevels from the matching model', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.updateConfig('panel-1', { model: 'opus' })
    store.setInitResult('panel-1', mockInitResult)

    const levels = getEffortLevelsForModel(store.getPanel('panel-1'))
    expect(levels).toEqual(['medium', 'high', 'max'])
  })

  it('returns all levels when model supportsEffort but no supportedEffortLevels array', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.setInitResult('panel-1', {
      ...mockInitResult,
      models: [{ value: 'sonnet', displayName: 'Sonnet', description: '', supportsEffort: true }],
    })

    const levels = getEffortLevelsForModel(store.getPanel('panel-1'))
    expect(levels).toEqual(['low', 'medium', 'high', 'max'])
  })

  it('returns empty array when model explicitly does not support effort', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.updateConfig('panel-1', { model: 'haiku' })
    store.setInitResult('panel-1', mockInitResult)

    const levels = getEffortLevelsForModel(store.getPanel('panel-1'))
    expect(levels).toEqual([])
  })

  it('matches model by value field against config.model', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.updateConfig('panel-1', { model: 'opus' })
    store.setInitResult('panel-1', mockInitResult)

    const levels = getEffortLevelsForModel(store.getPanel('panel-1'))
    expect(levels).toEqual(['medium', 'high', 'max'])
  })
})

describe('getSlashCommandsForPanel', () => {
  it('returns empty array when initResult is null', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    expect(getSlashCommandsForPanel(store.getPanel('panel-1'))).toEqual([])
  })

  it('returns initResult.commands when available', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.setInitResult('panel-1', mockInitResult)

    const cmds = getSlashCommandsForPanel(store.getPanel('panel-1'))
    expect(cmds).toHaveLength(3)
    expect(cmds[0].name).toBe('help')
  })
})

describe('getAccountInfoForPanel', () => {
  it('returns null when initResult is null', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    expect(getAccountInfoForPanel(store.getPanel('panel-1'))).toBeNull()
  })

  it('returns initResult.account when available', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.setInitResult('panel-1', mockInitResult)

    const info = getAccountInfoForPanel(store.getPanel('panel-1'))
    expect(info!.email).toBe('dev@example.com')
    expect(info!.organization).toBe('Acme Corp')
  })
})

describe('getFastModeStateForPanel', () => {
  it('returns undefined when initResult is null', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    expect(getFastModeStateForPanel(store.getPanel('panel-1'))).toBeUndefined()
  })

  it('returns initResult.fast_mode_state when set', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.setInitResult('panel-1', mockInitResult)

    expect(getFastModeStateForPanel(store.getPanel('panel-1'))).toBe('on')
  })

  it('returns undefined when fast_mode_state not in initResult', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    const { fast_mode_state: _, ...noFastMode } = mockInitResult
    store.setInitResult('panel-1', noFastMode as InitializationResult)

    expect(getFastModeStateForPanel(store.getPanel('panel-1'))).toBeUndefined()
  })
})

describe('getAgentsForPanel', () => {
  it('returns empty array when initResult is null', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    expect(getAgentsForPanel(store.getPanel('panel-1'))).toEqual([])
  })

  it('returns initResult.agents when available', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.setInitResult('panel-1', mockInitResult)

    const agents = getAgentsForPanel(store.getPanel('panel-1'))
    expect(agents).toHaveLength(2)
    expect(agents[0].name).toBe('Explore')
    expect(agents[1].name).toBe('Plan')
  })
})

// ---- sdkUuid on ClaudeMessage ----

describe('ClaudeMessage sdkUuid', () => {
  it('addMessage preserves sdkUuid on the stored message', () => {
    const store = useClaudeStore.getState()
    store.initPanel('p1')
    store.addMessage('p1', {
      id: 'msg-1',
      type: 'user',
      content: 'Hello',
      sdkUuid: 'sdk-uuid-123',
      ts: Date.now(),
    })

    const panel = store.getPanel('p1')
    expect(panel.messages[0].sdkUuid).toBe('sdk-uuid-123')
  })

  it('endStream accepts and stores optional sdkUuid', () => {
    const store = useClaudeStore.getState()
    store.initPanel('p1')
    store.setStreaming('p1', true)
    store.appendStreamDelta('p1', 'Hello ')
    store.endStream('p1', 'Hello world', 'sdk-asst-uuid')

    const panel = store.getPanel('p1')
    const lastMsg = panel.messages[panel.messages.length - 1]
    expect(lastMsg.type).toBe('assistant')
    expect(lastMsg.content).toBe('Hello world')
    expect(lastMsg.sdkUuid).toBe('sdk-asst-uuid')
  })

  it('endStream works without sdkUuid (backward compat)', () => {
    const store = useClaudeStore.getState()
    store.initPanel('p1')
    store.setStreaming('p1', true)
    store.appendStreamDelta('p1', 'Hi')
    store.endStream('p1', 'Hi')

    const panel = store.getPanel('p1')
    const lastMsg = panel.messages[panel.messages.length - 1]
    expect(lastMsg.sdkUuid).toBeUndefined()
  })

  it('loadSessionHistory preserves sdkUuid from message objects', () => {
    const store = useClaudeStore.getState()
    store.initPanel('p1')
    store.loadSessionHistory(
      'p1',
      [
        { id: 'u1', type: 'user', content: 'Hi', sdkUuid: 'sdk-u1', ts: 1 },
        { id: 'a1', type: 'assistant', content: 'Hello', sdkUuid: 'sdk-a1', ts: 2 },
      ],
      'session-123'
    )

    const panel = store.getPanel('p1')
    expect(panel.messages[0].sdkUuid).toBe('sdk-u1')
    expect(panel.messages[1].sdkUuid).toBe('sdk-a1')
  })
})

describe('getAnyInitResult', () => {
  it('returns null when no panels exist', () => {
    expect(getAnyInitResult()).toBeNull()
  })

  it('returns null when all panels have null initResult', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.initPanel('panel-2')

    expect(getAnyInitResult()).toBeNull()
  })

  it('returns first non-null initResult', () => {
    const store = useClaudeStore.getState()
    store.initPanel('panel-1')
    store.initPanel('panel-2')
    store.setInitResult('panel-2', mockInitResult)

    const result = getAnyInitResult()
    expect(result).not.toBeNull()
    expect(result!.account.email).toBe('dev@example.com')
  })
})
