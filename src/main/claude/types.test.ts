import { describe, it, expect } from 'vitest'
import type { ClaudeTaskEvent, ClaudeIpcMessage } from './types'

describe('ClaudeTaskEvent type', () => {
  it('task-started has required fields', () => {
    const msg: ClaudeTaskEvent = {
      type: 'task-event',
      subtype: 'task-started',
      taskId: 'task-1',
      description: 'Running tests',
      ts: Date.now(),
    }
    expect(msg.type).toBe('task-event')
    expect(msg.subtype).toBe('task-started')
    expect(msg.taskId).toBe('task-1')
    expect(msg.description).toBe('Running tests')
  })

  it('task-started accepts optional fields', () => {
    const msg: ClaudeTaskEvent = {
      type: 'task-event',
      subtype: 'task-started',
      taskId: 'task-1',
      description: 'Running tests',
      taskType: 'background',
      prompt: 'Run the test suite',
      toolUseId: 'tool-123',
      ts: Date.now(),
    }
    expect(msg.taskType).toBe('background')
    expect(msg.prompt).toBe('Run the test suite')
    expect(msg.toolUseId).toBe('tool-123')
  })

  it('task-progress has required fields', () => {
    const msg: ClaudeTaskEvent = {
      type: 'task-event',
      subtype: 'task-progress',
      taskId: 'task-1',
      description: 'Analyzing files',
      usage: { totalTokens: 1200, toolUses: 5, durationMs: 12000 },
      ts: Date.now(),
    }
    expect(msg.subtype).toBe('task-progress')
    expect(msg.usage).toEqual({ totalTokens: 1200, toolUses: 5, durationMs: 12000 })
  })

  it('task-progress accepts optional fields', () => {
    const msg: ClaudeTaskEvent = {
      type: 'task-event',
      subtype: 'task-progress',
      taskId: 'task-1',
      description: 'Analyzing files',
      lastToolName: 'Read',
      summary: 'Reading config files',
      usage: { totalTokens: 1200, toolUses: 5, durationMs: 12000 },
      ts: Date.now(),
    }
    expect(msg.lastToolName).toBe('Read')
    expect(msg.summary).toBe('Reading config files')
  })

  it('task-notification has required fields', () => {
    const msg: ClaudeTaskEvent = {
      type: 'task-event',
      subtype: 'task-notification',
      taskId: 'task-1',
      description: 'Running tests',
      status: 'completed',
      summary: 'Fixed 3 tests',
      outputFile: '/tmp/task-output.json',
      ts: Date.now(),
    }
    expect(msg.subtype).toBe('task-notification')
    expect(msg.status).toBe('completed')
    expect(msg.summary).toBe('Fixed 3 tests')
    expect(msg.outputFile).toBe('/tmp/task-output.json')
  })

  it('task-notification accepts failed and stopped statuses', () => {
    const failed: ClaudeTaskEvent = {
      type: 'task-event',
      subtype: 'task-notification',
      taskId: 'task-1',
      description: 'Build',
      status: 'failed',
      summary: 'Build error',
      outputFile: '/tmp/out.json',
      ts: Date.now(),
    }
    expect(failed.status).toBe('failed')

    const stopped: ClaudeTaskEvent = {
      type: 'task-event',
      subtype: 'task-notification',
      taskId: 'task-2',
      description: 'Tests',
      status: 'stopped',
      summary: 'User cancelled',
      outputFile: '/tmp/out2.json',
      ts: Date.now(),
    }
    expect(stopped.status).toBe('stopped')
  })

  it('is assignable to ClaudeIpcMessage', () => {
    const msg: ClaudeTaskEvent = {
      type: 'task-event',
      subtype: 'task-started',
      taskId: 'task-1',
      description: 'Running tests',
      ts: Date.now(),
    }
    // This assignment verifies ClaudeTaskEvent is in the ClaudeIpcMessage union
    const ipcMsg: ClaudeIpcMessage = msg
    expect(ipcMsg.type).toBe('task-event')
  })
})
