import { describe, it, expect } from 'vitest'
import { PRICING_RULES } from '../../src/types'
import type { Panel, PanelType } from '../../src/types'

describe('CSV Parser and Script Import/Export', () => {
  // Implementation of parser from PreProductionAndScriptTab
  const parseCsvLines = (text: string): string[][] => {
    const lines: string[][] = []
    let currentRow: string[] = []
    let currentField = ''
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentField += '"'
          i++
        } else if (char === '"') {
          inQuotes = false
        } else {
          currentField += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === ',') {
          currentRow.push(currentField)
          currentField = ''
        } else if (char === '\r') {
          // ignore
        } else if (char === '\n') {
          currentRow.push(currentField)
          lines.push(currentRow)
          currentRow = []
          currentField = ''
        } else {
          currentField += char
        }
      }
    }

    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField)
      lines.push(currentRow)
    }

    return lines
  }

  const parseAndLoadCsv = (csvText: string) => {
    const lines = parseCsvLines(csvText)
    if (lines.length === 0) return []

    let startIndex = 0
    const firstRow = lines[0].map((c) => c.trim().toLowerCase())
    if (firstRow.some((c) => c.includes('shot') || c.includes('panel') || c.includes('script'))) {
      startIndex = 1
    }

    const shotMap = new Map<
      number,
      {
        sceneIntro: string
        isAnimated: boolean
        customPrice: number
        panels: Panel[]
      }
    >()

    for (let i = startIndex; i < lines.length; i++) {
      const row = lines[i]
      if (row.length < 2 || !row.some((c) => c.trim())) continue

      let shotNum = parseInt(row[0]?.replace(/\D/g, '') || '', 10)
      if (isNaN(shotNum) && row[1]) {
        const match = row[1].match(/^(\d+)/)
        if (match) shotNum = parseInt(match[1], 10)
      }
      if (isNaN(shotNum)) shotNum = shotMap.size + 1

      const panelCodeRaw = (row[1] || '').trim()
      const typeRaw = (row[2] || '').trim().toUpperCase()
      const priceRaw = parseFloat((row[3] || '').replace(/[^0-9.]/g, '')) || 0
      const scriptSegment = (row[4] || '').trim()
      const directionNotes = (row[5] || '').trim()

      let panelType: PanelType = 'NONE'
      if (typeRaw.includes('COMPLEX BASE')) panelType = 'COMPLEX BASE'
      else if (typeRaw.includes('SIMPLE BASE')) panelType = 'SIMPLE BASE'
      else if (typeRaw.includes('COMPLEX ALT')) panelType = 'COMPLEX ALT'
      else if (typeRaw.includes('SIMPLE ALT')) panelType = 'SIMPLE ALT'
      else if (typeRaw.includes('ANIMAT')) panelType = 'ANIMATED'
      else if (typeRaw.includes('NONE')) panelType = 'NONE'

      if (!shotMap.has(shotNum)) {
        shotMap.set(shotNum, {
          sceneIntro: '',
          isAnimated: panelType === 'ANIMATED',
          customPrice: panelType === 'ANIMATED' ? priceRaw : 0,
          panels: [],
        })
      }

      const shotEntry = shotMap.get(shotNum)!
      if (panelType === 'ANIMATED') {
        shotEntry.isAnimated = true
        if (priceRaw > 0) shotEntry.customPrice = priceRaw
      }

      const panelLetter =
        panelCodeRaw.replace(/^[0-9]+/, '').toUpperCase() || 'A'
      const calculatedPrice = panelType === 'ANIMATED' ? priceRaw : PRICING_RULES[panelType] || 0

      shotEntry.panels.push({
        id: `p-test-${shotNum}-${shotEntry.panels.length}`,
        panelLetter: panelLetter || 'A',
        panelCode: `${shotNum}${panelLetter || 'A'}`,
        type: panelType,
        price: calculatedPrice,
        scriptSegment,
        directionNotes,
        status: 'Not Started',
        sketchOk: false,
        driveLink: '',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
    }

    return Array.from(shotMap.entries()).map(([shotNumber, data]) => ({
      shotNumber,
      ...data,
    }))
  }

  describe('parseCsvLines', () => {
    it('parses basic CSV rows correctly', () => {
      const csv = '1,1A,SIMPLE BASE,18,Hello world,Camera zoom\n2,2A,COMPLEX BASE,36,Another line,Pan right'
      const result = parseCsvLines(csv)

      expect(result.length).toBe(2)
      expect(result[0]).toEqual(['1', '1A', 'SIMPLE BASE', '18', 'Hello world', 'Camera zoom'])
      expect(result[1]).toEqual(['2', '2A', 'COMPLEX BASE', '36', 'Another line', 'Pan right'])
    })

    it('handles quoted fields with commas and double quotes correctly', () => {
      const csv = '1,1A,COMPLEX BASE,36,"He said, ""Hello!""",Notes with, commas'
      const result = parseCsvLines(csv)

      expect(result.length).toBe(1)
      expect(result[0][4]).toBe('He said, "Hello!"')
      expect(result[0][5]).toBe('Notes with')
      expect(result[0][6]).toBe(' commas')
    })

    it('handles multiline text inside quoted cells', () => {
      const csv = '1,1A,SIMPLE BASE,18,"Line 1\nLine 2",Notes'
      const result = parseCsvLines(csv)

      expect(result.length).toBe(1)
      expect(result[0][4]).toBe('Line 1\nLine 2')
    })
  })

  describe('parseAndLoadCsv', () => {
    it('skips header line when standard header names are present', () => {
      const csv = `Shot,Panel,Type,Price,Script Segment,Direction & Notes
1,1A,COMPLEX BASE,$36,Dialogue text,Draw hero`

      const shots = parseAndLoadCsv(csv)
      expect(shots.length).toBe(1)
      expect(shots[0].shotNumber).toBe(1)
      expect(shots[0].panels[0].panelCode).toBe('1A')
      expect(shots[0].panels[0].price).toBe(36)
      expect(shots[0].panels[0].scriptSegment).toBe('Dialogue text')
    })

    it('groups multiple panels into single shots by shotNumber', () => {
      const csv = `Shot,Panel,Type,Price,Script,Notes
1,1A,COMPLEX BASE,36,First line,Note 1
1,1B,SIMPLE ALT,3,Second line,Note 2
1,1C,COMPLEX ALT,9,Third line,Note 3
2,2A,SIMPLE BASE,18,New shot dialogue,Note 4`

      const shots = parseAndLoadCsv(csv)
      expect(shots.length).toBe(2)

      // Shot 1 has 3 panels
      expect(shots[0].shotNumber).toBe(1)
      expect(shots[0].panels.length).toBe(3)
      expect(shots[0].panels[0].type).toBe('COMPLEX BASE')
      expect(shots[0].panels[1].type).toBe('SIMPLE ALT')
      expect(shots[0].panels[2].type).toBe('COMPLEX ALT')

      // Shot 2 has 1 panel
      expect(shots[1].shotNumber).toBe(2)
      expect(shots[1].panels.length).toBe(1)
    })

    it('identifies ANIMATED panel type and sets customPrice', () => {
      const csv = `Shot,Panel,Type,Price,Script,Notes
3,3A,ANIMATED,180,Full animated action scene,Sakuga animation`

      const shots = parseAndLoadCsv(csv)
      expect(shots[0].isAnimated).toBe(true)
      expect(shots[0].customPrice).toBe(180)
      expect(shots[0].panels[0].type).toBe('ANIMATED')
      expect(shots[0].panels[0].price).toBe(180)
    })
  })

  describe('CSV Export String Formatting', () => {
    it('properly quotes and escapes fields for export', () => {
      const scriptSegment = 'She shouted, "Look out!"'
      const directionNotes = 'Close-up, dramatic lighting'

      const scriptClean = `"${scriptSegment.replace(/"/g, '""')}"`
      const notesClean = `"${directionNotes.replace(/"/g, '""')}"`

      expect(scriptClean).toBe('"She shouted, ""Look out!"""')
      expect(notesClean).toBe('"Close-up, dramatic lighting"')
    })
  })
})
