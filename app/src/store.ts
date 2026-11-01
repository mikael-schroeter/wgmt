import { create } from 'zustand'
import { emptyData, type AppData, type DayEntry, type MonthTeam, type TeamDay, type WeekMeta } from './lib/types'
import { todayKey, type DateKey, type WeekKey } from './lib/dates'

const LS_KEY = 'zaehlwerk:v1'

export type Tab = 'heute' | 'woche' | 'quoten' | 'team' | 'ziele'
export const TABS: Tab[] = ['heute', 'woche', 'quoten', 'team', 'ziele']

const readLocal = (): AppData | null => {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? migrate(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

const writeLocal = (d: AppData) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(d)) } catch { /* Speicher voll / nicht verfügbar */ }
}

/** Fehlende Felder ergänzen, damit ältere Stände weiter funktionieren. */
export const migrate = (raw: Partial<AppData>): AppData => {
  const base = emptyData()
  return {
    ...base,
    ...raw,
    profile: { ...base.profile, ...raw.profile },
    goal: { ...base.goal, ...raw.goal, milestones: raw.goal?.milestones?.length ? raw.goal.milestones : base.goal.milestones },
    defaults: { ...base.defaults, ...raw.defaults },
    days: raw.days ?? {}, teamDays: raw.teamDays ?? {}, weeks: raw.weeks ?? {}, months: raw.months ?? {},
    version: 1,
  }
}

const clean = <T extends object>(o: T): T | undefined => {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== '' && v !== null) out[k] = v
  return Object.keys(out).length ? (out as T) : undefined
}

interface Store {
  data: AppData
  date: DateKey
  tab: Tab
  cloud: 'off' | 'connecting' | 'on'
  setTab(t: Tab): void
  setDate(k: DateKey): void
  setCloud(s: Store['cloud']): void
  /** Ganze Daten ersetzen (z. B. aus der Cloud geladen) – ohne Zeitstempel zu ändern. */
  replace(d: AppData): void
  update(fn: (d: AppData) => void): void
  patchDay(k: DateKey, p: Partial<DayEntry>): void
  bumpDay(k: DateKey, key: keyof DayEntry, delta: number): void
  patchTeamDay(k: DateKey, p: Partial<TeamDay>): void
  bumpTeam(k: DateKey, key: keyof TeamDay, delta: number): void
  patchWeek(wk: WeekKey, p: Partial<WeekMeta>): void
  patchMonth(m: string, p: Partial<MonthTeam>): void
}

const initialHash = (): Tab => {
  const h = (typeof location !== 'undefined' ? location.hash.slice(1) : '') as Tab
  return TABS.includes(h) ? h : 'heute'
}

export const useStore = create<Store>((set, get) => ({
  data: readLocal() ?? emptyData(),
  date: todayKey(),
  tab: initialHash(),
  cloud: 'off',
  setTab: (tab) => {
    set({ tab })
    try { history.replaceState(null, '', `#${tab}`) } catch { /* Sandbox */ }
  },
  setDate: (date) => set({ date }),
  setCloud: (cloud) => set({ cloud }),
  replace: (d) => { writeLocal(d); set({ data: d }) },
  update: (fn) => {
    const d: AppData = structuredClone(get().data)
    fn(d)
    d.updatedAt = Date.now()
    writeLocal(d)
    set({ data: d })
  },
  patchDay: (k, p) => get().update((d) => {
    const next = clean({ ...d.days[k], ...p })
    if (next) d.days[k] = next
    else delete d.days[k]
  }),
  bumpDay: (k, key, delta) => get().update((d) => {
    const cur = (d.days[k]?.[key] as number | undefined) ?? 0
    const v = Math.max(0, Math.round((cur + delta) * 100) / 100)
    const next = clean({ ...d.days[k], [key]: v || undefined })
    if (next) d.days[k] = next
    else delete d.days[k]
  }),
  patchTeamDay: (k, p) => get().update((d) => {
    const next = clean({ ...d.teamDays[k], ...p })
    if (next) d.teamDays[k] = next
    else delete d.teamDays[k]
  }),
  bumpTeam: (k, key, delta) => get().update((d) => {
    const cur = (d.teamDays[k]?.[key] as number | undefined) ?? 0
    const v = Math.max(0, cur + delta)
    const next = clean({ ...d.teamDays[k], [key]: v || undefined })
    if (next) d.teamDays[k] = next
    else delete d.teamDays[k]
  }),
  patchWeek: (wk, p) => get().update((d) => {
    d.weeks[wk] = { ...d.weeks[wk], ...p }
  }),
  patchMonth: (m, p) => get().update((d) => {
    const next = clean({ ...d.months[m], ...p })
    if (next) d.months[m] = next
    else delete d.months[m]
  }),
}))
