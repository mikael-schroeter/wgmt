/** Ein Tag im Eigenumsatz – entspricht einer Tageszeile im Blatt „Eigenumsatz 2026“. */
export interface DayEntry {
  hours?: number
  klingeln?: number
  entscheider?: number
  /** Strom-/Gasrechnungen, die der Entscheider gezeigt hat */
  abrechnungen?: number
  kunden?: number
  zaehler?: number
  /** Brutto-Provision aus D2D (€) */
  provD2D?: number
  /** Abseits von D2D: Empfehlungen, Bestandskunden … */
  zaehlerExtra?: number
  provExtra?: number
  note?: string
}

/** Ein Tag im Teamaufbau – Blatt „Teamumsatz 2026“. */
export interface TeamDay {
  gepitcht?: number
  terminiert?: number
  praesentiert?: number
  registriert?: number
  folgetermin?: number
  note?: string
}

export type D2DCountKey = 'klingeln' | 'entscheider' | 'abrechnungen' | 'kunden' | 'zaehler'
export type TeamKey = 'gepitcht' | 'terminiert' | 'praesentiert' | 'registriert' | 'folgetermin'

/** Alle Kennzahlen, für die es ein Wochenziel geben kann. */
export type MetricKey =
  | 'hours' | D2DCountKey | 'provD2D' | 'zaehlerExtra' | 'provExtra' | 'brutto' | 'netto'

export type Targets = Partial<Record<MetricKey, number>>
export type TeamTargets = Partial<Record<TeamKey, number>>

export interface WeekMeta {
  /** Storno-Quote dieser Woche in Prozent (0–100) */
  storno?: number | null
  targets?: Targets
  teamTargets?: TeamTargets
}

export interface Milestone { text: string; done: boolean }

export interface MonthTeam { vps?: number; auftraege?: number }

export interface AppData {
  version: 1
  updatedAt: number
  profile: { name: string }
  goal: { text: string; nettoYear: number | null; milestones: Milestone[] }
  defaults: { storno: number | null; targets: Targets; teamTargets: TeamTargets }
  days: Record<string, DayEntry>
  teamDays: Record<string, TeamDay>
  weeks: Record<string, WeekMeta>
  months: Record<string, MonthTeam>
}

export const emptyData = (): AppData => ({
  version: 1,
  updatedAt: 0,
  profile: { name: '' },
  goal: { text: '', nettoYear: null, milestones: [
    { text: '', done: false }, { text: '', done: false }, { text: '', done: false }, { text: '', done: false },
  ] },
  defaults: { storno: null, targets: {}, teamTargets: {} },
  days: {}, teamDays: {}, weeks: {}, months: {},
})
