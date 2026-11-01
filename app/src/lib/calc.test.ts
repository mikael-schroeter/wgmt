import { describe, expect, it } from 'vitest'
import { ampel, dayNetto, quotes, stornoLight, weekTotals, yearTotals } from './calc'
import { isoWeek, mondayOfWeek, weekKey, weeksOfYear } from './dates'
import { emptyData } from './types'

describe('Kalenderwochen wie in der Tabelle', () => {
  it('KW 1/2026 beginnt Montag, 29.12.2025', () => {
    expect(weekKey('2025-12-29')).toBe('2026-W01')
    expect(weekKey('2026-01-04')).toBe('2026-W01')
    expect(weekKey('2026-01-05')).toBe('2026-W02')
    expect(mondayOfWeek('2026-W01')).toBe('2025-12-29')
    expect(isoWeek('2026-12-31').week).toBe(53)
    expect(weeksOfYear(2026).length).toBe(53)
  })
})

describe('Berechnungen', () => {
  const d = emptyData()
  d.days['2026-01-05'] = { hours: 5, klingeln: 100, entscheider: 40, abrechnungen: 20, kunden: 5, zaehler: 8, provD2D: 400, provExtra: 100 }
  d.days['2026-01-06'] = { klingeln: 50, provD2D: 200 }
  d.weeks['2026-W02'] = { storno: 20 }

  it('Netto = (D2D + abseits) × (1 − Storno der Woche)', () => {
    expect(dayNetto(d, '2026-01-05')).toBeCloseTo(400)
  })
  it('Wochenergebnis summiert die Spalten', () => {
    const t = weekTotals(d, '2026-W02')
    expect(t.klingeln).toBe(150)
    expect(t.brutto).toBe(700)
    expect(t.netto).toBeCloseTo(560)
  })
  it('Quoten', () => {
    const q = quotes(weekTotals(d, '2026-W02'))
    expect(q.rechnungsQuote).toBe(0.5)
    expect(q.abschlussQuote).toBe(0.25)
    expect(q.zaehlerProKunde).toBe(1.6)
  })
  it('Ampel <80 % rot, 80–99 % gelb, ≥100 % grün', () => {
    expect(ampel(79, 100)).toBe('red')
    expect(ampel(80, 100)).toBe('amber')
    expect(ampel(100, 100)).toBe('green')
    expect(ampel(0, 100)).toBe('none')
    expect(ampel(10)).toBe('none')
  })
  it('Storno-Ampel', () => {
    expect(stornoLight(40, true)).toBe('red')
    expect(stornoLight(36, true)).toBe('amber')
    expect(stornoLight(20, true)).toBe('green')
  })
  it('Jahr zählt nach KW', () => {
    d.days['2025-12-29'] = { klingeln: 1 }
    expect(yearTotals(d, 2026).klingeln).toBe(151)
  })
})
