import { describe, it, expect } from 'vitest'
import { getMessageActions } from './message-actions'

describe('getMessageActions', () => {
  it('returns fork + rewind for user messages with sdkUuid', () => {
    expect(getMessageActions({ type: 'user', sdkUuid: 'abc' })).toEqual(['fork', 'rewind'])
  })

  it('returns fork only for assistant messages with sdkUuid', () => {
    expect(getMessageActions({ type: 'assistant', sdkUuid: 'abc' })).toEqual(['fork'])
  })

  it('returns empty for messages without sdkUuid', () => {
    expect(getMessageActions({ type: 'user' })).toEqual([])
  })

  it('returns empty for tool-use messages even with sdkUuid', () => {
    expect(getMessageActions({ type: 'tool-use', sdkUuid: 'abc' })).toEqual([])
  })

  it('returns empty for tool-result messages', () => {
    expect(getMessageActions({ type: 'tool-result', sdkUuid: 'abc' })).toEqual([])
  })

  it('returns empty for system messages', () => {
    expect(getMessageActions({ type: 'system', sdkUuid: 'abc' })).toEqual([])
  })
})
