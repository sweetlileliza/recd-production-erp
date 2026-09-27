import { describe, it, expect, beforeEach, vi } from 'vitest'
import { serverCache } from '../../server/db/cache'

describe('serverCache (MemoryCache)', () => {
  beforeEach(() => {
    serverCache.clear()
    vi.useRealTimers()
  })

  it('stores and retrieves a cached value', () => {
    serverCache.set('key1', { name: 'Test Project', count: 42 })
    const result = serverCache.get<{ name: string; count: number }>('key1')
    expect(result).toEqual({ name: 'Test Project', count: 42 })
  })

  it('returns null for a non-existent key', () => {
    const result = serverCache.get('non-existent-key')
    expect(result).toBeNull()
  })

  it('expires items after default TTL (10 seconds)', () => {
    vi.useFakeTimers()
    serverCache.set('expireKey', 'some value')

    expect(serverCache.get('expireKey')).toBe('some value')

    // Advance 9.9 seconds - should still be cached
    vi.advanceTimersByTime(9900)
    expect(serverCache.get('expireKey')).toBe('some value')

    // Advance past 10 seconds - should be expired and removed
    vi.advanceTimersByTime(200)
    expect(serverCache.get('expireKey')).toBeNull()
  })

  it('respects custom TTL when provided', () => {
    vi.useFakeTimers()
    serverCache.set('customTtlKey', 'fast-expiry', 2000) // 2 seconds

    expect(serverCache.get('customTtlKey')).toBe('fast-expiry')

    vi.advanceTimersByTime(1500)
    expect(serverCache.get('customTtlKey')).toBe('fast-expiry')

    vi.advanceTimersByTime(600)
    expect(serverCache.get('customTtlKey')).toBeNull()
  })

  it('deletes an entry by key', () => {
    serverCache.set('delKey', 12345)
    expect(serverCache.get('delKey')).toBe(12345)

    serverCache.delete('delKey')
    expect(serverCache.get('delKey')).toBeNull()
  })

  it('deletes all keys matching a prefix', () => {
    serverCache.set('projects:all', [1, 2, 3])
    serverCache.set('projects:1', { id: '1' })
    serverCache.set('projects:2', { id: '2' })
    serverCache.set('team:all', ['Alice', 'Bob'])

    serverCache.deletePrefix('projects:')

    expect(serverCache.get('projects:all')).toBeNull()
    expect(serverCache.get('projects:1')).toBeNull()
    expect(serverCache.get('projects:2')).toBeNull()
    // Other prefixes should remain intact
    expect(serverCache.get('team:all')).toEqual(['Alice', 'Bob'])
  })

  it('clears all entries completely', () => {
    serverCache.set('a', 1)
    serverCache.set('b', 2)
    serverCache.set('c', 3)

    serverCache.clear()

    expect(serverCache.get('a')).toBeNull()
    expect(serverCache.get('b')).toBeNull()
    expect(serverCache.get('c')).toBeNull()
  })

  it('handles overwriting an existing key with new value and updated expiration', () => {
    vi.useFakeTimers()
    serverCache.set('counter', 1, 3000)

    vi.advanceTimersByTime(2000)
    // Overwrite before expiry
    serverCache.set('counter', 2, 5000)

    // Advance 2 more seconds (total 4s from start; original would have expired at 3s)
    vi.advanceTimersByTime(2000)
    expect(serverCache.get('counter')).toBe(2)

    // Advance 3.5s more -> total 5.5s from second set -> now expired
    vi.advanceTimersByTime(3500)
    expect(serverCache.get('counter')).toBeNull()
  })
})
