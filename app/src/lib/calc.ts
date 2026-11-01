import type { AppData, DayEntry, MetricKey, TeamDay, TeamKey, Targets, TeamTargets } from './types'
import { mondayOfWeek, weekDays, weekKey, weeksOfYear, type DateKey, type WeekKey } from './dates'

export type Totals = Record<MetricKey, number>

const n = (v?: number) => (typeof v === 'number' && isFinite(v) ? v : 0)

export const dayBrutto = (d?: DayEntry) => n(d?.provD2D) + n(d?.provExtra)

/** Storno-Quote einer Woche in % – Wochenwert, sonst Standardwert, sonst 0 (wie die Tabelle). */
export const stornoOf = (data: AppData, wk: WeekKey): number =>
  data.weeks[wk]?.storno ?? data.defaults.storno ?? 0

export const isStornoSet = (data: AppData, wk: WeekKey) =>
  data.weeks[wk]?.storno != null || data.defaults.storno != null

/** Netto = Brutto × (1 − Storno-Quote der Woche) – Spalte M der Tabelle. */
export const dayNetto = (data: AppData, k: DateKey) =>
  dayBrutto(data.days[k]) * (1 - stornoOf(data, weekKey(k)) / 100)

export const zeroTotals = (): Totals => ({
  hours: 0, klingeln: 0, entscheider: 0, abrechnungen: 0, kunden: 0, zaehler: 0,
  provD2D: 0, zaehlerExtra: 0, provExtra: 0, brutto: 0, netto: 0,
})

export const sumDays = (data: AppData, keys: DateKey[]): Totals => {
  const t = zeroTotals()
  for (const k of keys) {
    const d = data.days[k]
    if (!d) continue
    t.hours += n(d.hours)
    t.klingeln += n(d.klingeln)
    t.entscheider += n(d.entscheider)
    t.abrechnungen += n(d.abrechnungen)
    t.kunden += n(d.kunden)
    t.zaehler += n(d.zaehler)
    t.provD2D += n(d.provD2D)
    t.zaehlerExtra += n(d.zaehlerExtra)
    t.provExtra += n(d.provExtra)
    t.brutto += dayBrutto(d)
    t.netto += dayNetto(data, k)
  }
  return t
}

export const weekTotals = (data: AppData, wk: WeekKey) => sumDays(data, weekDays(mondayOfWeek(wk)))

export type TeamTotals = Record<TeamKey, number>
export const sumTeam = (days: Record<string, TeamDay>, keys: DateKey[]): TeamTotals => {
  const t: TeamTotals = { gepitcht: 0, terminiert: 0, praesentiert: 0, registriert: 0, folgetermin: 0 }
  for (const k of keys) {
    const d = days[k]
    if (!d) continue
    for (const key of Object.keys(t) as TeamKey[]) t[key] += n(d[key])
  }
  return t
}

export const effectiveTargets = (data: AppData, wk: WeekKey): Targets => ({
  ...data.defaults.targets, ...(data.weeks[wk]?.targets ?? {}),
})
export const effectiveTeamTargets = (data: AppData, wk: WeekKey): TeamTargets => ({
  ...data.defaults.teamTargets, ...(data.weeks[wk]?.teamTargets ?? {}),
})

/** Ampel wie die bedingte Formatierung: <80 % rot, 80–99 % gelb, ≥100 % grün. Ohne Ziel/Wert: neutral. */
export type Light = 'none' | 'red' | 'amber' | 'green'
export const ampel = (value: number, target?: number): Light => {
  if (!target || target <= 0 || value <= 0) return 'none'
  if (value >= target) return 'green'
  if (value >= target * 0.8) return 'amber'
  return 'red'
}

/** Storno: ab 40 % kritisch, ab 35 % Warnung, darunter gut. */
export const stornoLight = (pct: number, set: boolean): Light => {
  if (!set) return 'none'
  if (pct >= 40) return 'red'
  if (pct >= 35) return 'amber'
  return 'green'
}

/** Hervorhebungs-Schwellen aus der Tabelle. */
export const TOP_DAY_PROV = 500
export const TOP_WEEK_NETTO = 2500

/** Quote als Bruch; null wenn Nenner 0. */
export const ratio = (a: number, b: number): number | null => (b > 0 ? a / b : null)

export interface Quotes {
  entscheiderQuote: number | null   // Entscheider / Klingeln
  rechnungsQuote: number | null     // Abrechnungen / Entscheider
  abschlussQuote: number | null     // Kunden / Abrechnungen
  kundenProEntscheider: number | null
  klingelnProKunde: number | null
  zaehlerProKunde: number | null
  euroProZaehler: number | null     // D2D-Provision / D2D-Zähler
  euroProStunde: number | null      // D2D-Provision / Stunde
  klingelnProStunde: number | null
  euroProKlingeln: number | null
}

export const quotes = (t: Totals): Quotes => ({
  entscheiderQuote: ratio(t.entscheider, t.klingeln),
  rechnungsQuote: ratio(t.abrechnungen, t.entscheider),
  abschlussQuote: ratio(t.kunden, t.abrechnungen),
  kundenProEntscheider: ratio(t.kunden, t.entscheider),
  klingelnProKunde: ratio(t.klingeln, t.kunden),
  zaehlerProKunde: ratio(t.zaehler, t.kunden),
  euroProZaehler: ratio(t.provD2D, t.zaehler),
  euroProStunde: ratio(t.provD2D, t.hours),
  klingelnProStunde: ratio(t.klingeln, t.hours),
  euroProKlingeln: ratio(t.provD2D, t.klingeln),
})

/** Summe aller Tage, deren KW zum Jahr gehört (wie die Tabelle: KW 1/2026 enthält den 29.12.2025). */
export const yearTotals = (data: AppData, year: number) =>
  sumDays(data, Object.keys(data.days).filter((k) => weekKey(k).startsWith(`${year}-`)))

export const yearWeeks = (year: number) => weeksOfYear(year)

/** Kompakte Wochenzusammenfassung, die ein VP mit seinem Teamleiter teilt. */
export interface WeekSummary {
  wk: WeekKey
  t: Totals
  team: TeamTotals
  storno: number
  targets: Targets
}

export const weekSummary = (data: AppData, wk: WeekKey): WeekSummary => ({
  wk,
  t: weekTotals(data, wk),
  team: sumTeam(data.teamDays, weekDays(mondayOfWeek(wk))),
  storno: stornoOf(data, wk),
  targets: effectiveTargets(data, wk),
})
