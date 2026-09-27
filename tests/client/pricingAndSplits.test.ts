import { describe, it, expect } from 'vitest'
import { PRICING_RULES } from '../../src/types'
import type { Shot, Panel, ArtistSplit } from '../../src/types'

describe('Studio Pricing & Ratio Split Logic', () => {
  describe('PRICING_RULES Constants', () => {
    it('defines official panel prices correctly', () => {
      expect(PRICING_RULES['COMPLEX BASE']).toBe(36)
      expect(PRICING_RULES['SIMPLE BASE']).toBe(18)
      expect(PRICING_RULES['COMPLEX ALT']).toBe(9)
      expect(PRICING_RULES['SIMPLE ALT']).toBe(3)
      expect(PRICING_RULES['ANIMATED']).toBe(0)
      expect(PRICING_RULES['NONE']).toBe(0)
    })
  })

  describe('Panel Letter Sequence Generator', () => {
    const getPanelLetter = (index: number): string => {
      let letter = ''
      while (index >= 0) {
        letter = String.fromCharCode(65 + (index % 26)) + letter
        index = Math.floor(index / 26) - 1
      }
      return letter
    }

    it('generates single letters A to Z', () => {
      expect(getPanelLetter(0)).toBe('A')
      expect(getPanelLetter(1)).toBe('B')
      expect(getPanelLetter(25)).toBe('Z')
    })

    it('generates double letters AA, AB, and beyond for large shot sets', () => {
      expect(getPanelLetter(26)).toBe('AA')
      expect(getPanelLetter(27)).toBe('AB')
      expect(getPanelLetter(51)).toBe('AZ')
      expect(getPanelLetter(52)).toBe('BA')
    })
  })

  describe('Shot Total and Grand Budget Calculation', () => {
    const getShotTotalPay = (shot: Shot): number => {
      return (
        (shot.isAnimated && shot.customPrice ? Number(shot.customPrice) : 0) +
        (shot.panels?.reduce((acc, p) => acc + (p.price || 0), 0) || 0)
      )
    }

    it('calculates standard shot total from individual panels', () => {
      const shot: Shot = {
        id: 's-1',
        shotNumber: 1,
        sceneIntro: 'Opening',
        isAnimated: false,
        panels: [
          { id: 'p1', panelLetter: 'A', panelCode: '1A', type: 'COMPLEX BASE', price: 36, scriptSegment: '', directionNotes: '', status: 'Not Started', sketchOk: false, driveLink: '', updatedAt: '' },
          { id: 'p2', panelLetter: 'B', panelCode: '1B', type: 'SIMPLE ALT', price: 3, scriptSegment: '', directionNotes: '', status: 'Not Started', sketchOk: false, driveLink: '', updatedAt: '' },
          { id: 'p3', panelLetter: 'C', panelCode: '1C', type: 'COMPLEX ALT', price: 9, scriptSegment: '', directionNotes: '', status: 'Not Started', sketchOk: false, driveLink: '', updatedAt: '' },
        ],
        updatedAt: '',
      }

      expect(getShotTotalPay(shot)).toBe(48) // 36 + 3 + 9
    })

    it('includes customPrice when shot is animated', () => {
      const shot: Shot = {
        id: 's-2',
        shotNumber: 2,
        sceneIntro: 'Fight scene',
        isAnimated: true,
        customPrice: 150,
        panels: [
          { id: 'p1', panelLetter: 'A', panelCode: '2A', type: 'ANIMATED', price: 0, scriptSegment: '', directionNotes: '', status: 'Not Started', sketchOk: false, driveLink: '', updatedAt: '' },
        ],
        updatedAt: '',
      }

      expect(getShotTotalPay(shot)).toBe(150)
    })

    it('calculates grand total budget across multiple shots', () => {
      const shots: Shot[] = [
        {
          id: 's-1',
          shotNumber: 1,
          sceneIntro: '',
          isAnimated: false,
          panels: [
            { id: 'p1', panelLetter: 'A', panelCode: '1A', type: 'COMPLEX BASE', price: 36, scriptSegment: '', directionNotes: '', status: 'Not Started', sketchOk: false, driveLink: '', updatedAt: '' },
            { id: 'p2', panelLetter: 'B', panelCode: '1B', type: 'SIMPLE BASE', price: 18, scriptSegment: '', directionNotes: '', status: 'Not Started', sketchOk: false, driveLink: '', updatedAt: '' },
          ],
          updatedAt: '',
        },
        {
          id: 's-2',
          shotNumber: 2,
          sceneIntro: '',
          isAnimated: true,
          customPrice: 120,
          panels: [],
          updatedAt: '',
        },
      ]

      const grandTotal = shots.reduce((acc, shot) => acc + getShotTotalPay(shot), 0)
      expect(grandTotal).toBe(54 + 120) // 174
    })
  })

  describe('Two-Way and Multi-Way Split Ratio Math', () => {
    it('calculates two-way ratio splits correctly', () => {
      const totalPay = 100
      const computeTwoWay = (firstPercent: number): [ArtistSplit, ArtistSplit] => {
        const p1 = Math.max(0, Math.min(100, Math.round(firstPercent)))
        const p2 = 100 - p1
        const a1 = Math.round((p1 / 100) * totalPay)
        const a2 = totalPay - a1
        return [
          { artistName: 'Artist 1', percentage: p1, amount: a1 },
          { artistName: 'Artist 2', percentage: p2, amount: a2 },
        ]
      }

      // 50/50 split
      const [s1, s2] = computeTwoWay(50)
      expect(s1.percentage).toBe(50)
      expect(s1.amount).toBe(50)
      expect(s2.percentage).toBe(50)
      expect(s2.amount).toBe(50)

      // 70/30 split
      const [s3, s4] = computeTwoWay(70)
      expect(s3.percentage).toBe(70)
      expect(s3.amount).toBe(70)
      expect(s4.percentage).toBe(30)
      expect(s4.amount).toBe(30)

      // Clamping test: > 100 clamps to 100/0
      const [s5, s6] = computeTwoWay(120)
      expect(s5.percentage).toBe(100)
      expect(s5.amount).toBe(100)
      expect(s6.percentage).toBe(0)
      expect(s6.amount).toBe(0)
    })

    it('adds new artist to multi-way split and distributes percentages evenly with remainder', () => {
      const totalPay = 120
      const existingSplits: ArtistSplit[] = [
        { artistName: 'Alice', percentage: 50, amount: 60 },
        { artistName: 'Bob', percentage: 50, amount: 60 },
      ]

      // Adding 3rd artist: count = 3. basePct = floor(100/3) = 33. remainder = 1.
      const count = existingSplits.length + 1
      const basePct = Math.floor(100 / count)
      const remainder = 100 - basePct * count

      const updatedSplits: ArtistSplit[] = [
        ...existingSplits.map((s, idx) => {
          const pct = basePct + (idx === 0 ? remainder : 0)
          return {
            ...s,
            percentage: pct,
            amount: Math.round((pct / 100) * totalPay),
          }
        }),
        {
          artistName: 'Charlie',
          percentage: basePct,
          amount: Math.round((basePct / 100) * totalPay),
        },
      ]

      expect(updatedSplits.length).toBe(3)
      expect(updatedSplits[0].percentage).toBe(34)
      expect(updatedSplits[1].percentage).toBe(33)
      expect(updatedSplits[2].percentage).toBe(33)
      const totalPercentage = updatedSplits.reduce((acc, s) => acc + s.percentage, 0)
      expect(totalPercentage).toBe(100)
    })

    it('removes artist and renormalizes remaining percentages to 100%', () => {
      const totalPay = 200
      const threeSplits: ArtistSplit[] = [
        { artistName: 'Alice', percentage: 34, amount: 68 },
        { artistName: 'Bob', percentage: 33, amount: 66 },
        { artistName: 'Charlie', percentage: 33, amount: 66 },
      ]

      // Remove Charlie (index 2)
      const filtered = threeSplits.filter((_, idx) => idx !== 2)
      const currentSum = filtered.reduce((acc, s) => acc + s.percentage, 0) || 1
      const renormalized = filtered.map((s) => {
        const pct = Math.round((s.percentage / currentSum) * 100)
        return {
          ...s,
          percentage: pct,
          amount: Math.round((pct / 100) * totalPay),
        }
      })

      expect(renormalized.length).toBe(2)
      expect(renormalized[0].artistName).toBe('Alice')
      expect(renormalized[1].artistName).toBe('Bob')
      expect(renormalized.reduce((acc, s) => acc + s.percentage, 0)).toBe(100)
    })
  })
})
