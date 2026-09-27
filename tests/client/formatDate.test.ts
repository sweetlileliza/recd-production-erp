import { describe, it, expect } from 'vitest'
import { formatEST, formatDateOnlyEST } from '../../src/utils/formatDate'

describe('formatDate utils (formatEST & formatDateOnlyEST)', () => {
  describe('formatEST', () => {
    it('returns empty string for null, undefined, or empty string', () => {
      expect(formatEST(null)).toBe('')
      expect(formatEST(undefined)).toBe('')
      expect(formatEST('')).toBe('')
    })

    it('returns empty string for invalid date strings', () => {
      expect(formatEST('invalid-date-string')).toBe('')
      expect(formatEST('2026-99-99T99:99:99')).toBe('')
    })

    it('formats UTC ISO timestamp into America/New_York date and time', () => {
      // 2026-06-15T16:30:00Z -> In EDT (UTC-4) it is 12:30 PM EDT
      const formatted = formatEST('2026-06-15T16:30:00Z')
      expect(formatted).toContain('Jun')
      expect(formatted).toContain('15')
      expect(formatted).toContain('12:30')
      expect(formatted).toContain('PM')
      expect(formatted).toContain('EDT')
    })

    it('formats winter UTC timestamp into America/New_York EST (UTC-5)', () => {
      // 2026-01-15T17:00:00Z -> In EST (UTC-5) it is 12:00 PM EST
      const formatted = formatEST('2026-01-15T17:00:00Z')
      expect(formatted).toContain('Jan')
      expect(formatted).toContain('15')
      expect(formatted).toContain('12:00')
      expect(formatted).toContain('PM')
      expect(formatted).toContain('EST')
    })
  })

  describe('formatDateOnlyEST', () => {
    it('returns empty string for null, undefined, or empty string', () => {
      expect(formatDateOnlyEST(null)).toBe('')
      expect(formatDateOnlyEST(undefined)).toBe('')
      expect(formatDateOnlyEST('')).toBe('')
    })

    it('returns empty string for invalid dates', () => {
      expect(formatDateOnlyEST('abc')).toBe('')
    })

    it('formats date only in America/New_York timezone', () => {
      // 2026-10-31T03:00:00Z -> Oct 30, 2026 in New York (23:00 EDT previous day)
      const formatted = formatDateOnlyEST('2026-10-31T03:00:00Z')
      expect(formatted).toContain('Oct')
      expect(formatted).toContain('30')
      expect(formatted).toContain('2026')
    })

    it('correctly handles New Year transition across timezones', () => {
      // 2026-01-01T02:00:00Z -> Dec 31, 2025 in New York (21:00 EST previous day)
      const formatted = formatDateOnlyEST('2026-01-01T02:00:00Z')
      expect(formatted).toContain('Dec')
      expect(formatted).toContain('31')
      expect(formatted).toContain('2025')
    })
  })
})
