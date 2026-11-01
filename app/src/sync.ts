import { create } from 'zustand'
import { connectCloud, type Cloud, type TeamMemberDoc } from './lib/cloud'
import { useStore, migrate } from './store'
import { weekSummary } from './lib/calc'
import { todayKey, weekKey, weeksOfYear } from './lib/dates'
import type { AppData } from './lib/types'

interface CloudState {
  cloud: Cloud | null
  members: TeamMemberDoc[]
  error: string | null
  names: Record<string, string>
  loadNames(ids: string[]): Promise<void>
}

export const useCloud = create<CloudState>((set, get) => ({
  cloud: null,
  members: [],
  error: null,
  names: {},
  async loadNames(ids) {
    const c = get().cloud
    if (!c) return
    try {
      const n = await c.names(ids)
      set({ names: { ...get().names, ...n } })
    } catch { /* Namen optional */ }
  },
}))

/** Wochensummen des laufenden Jahres bis heute – das, was der Teamleiter sieht. */
const teamDoc = (d: AppData) => {
  const wk = weekKey(todayKey())
  const year = Number(wk.slice(0, 4))
  const weeks = weeksOfYear(year).filter((w) => w <= wk).map((w) => weekSummary(d, w))
    .filter((s) => s.t.klingeln || s.t.brutto || s.t.hours || s.team.gepitcht || s.team.registriert || s.wk === wk)
  return { label: d.profile.name.trim(), updatedAt: d.updatedAt, year, weeks, goalNetto: d.goal.nettoYear }
}

let started = false

export async function startSync() {
  if (started) return
  started = true
  useStore.getState().setCloud('connecting')
  const cloud = await connectCloud()
  if (!cloud) { useStore.getState().setCloud('off'); return }
  useCloud.setState({ cloud })

  // Neuester Stand gewinnt (Handy und Laptop können beide schreiben).
  try {
    const remote = await cloud.loadState()
    const local = useStore.getState().data
    if (remote && remote.updatedAt > local.updatedAt) useStore.getState().replace(migrate(remote))
    else if (local.updatedAt > 0) await cloud.saveState(local)
  } catch { /* lokal weiterarbeiten */ }
  useStore.getState().setCloud('on')

  let lastTeam = ''
  const pushTeam = (d: AppData) => {
    if (!d.updatedAt) return
    const doc = teamDoc(d)
    const s = JSON.stringify(doc.weeks) + doc.label + doc.goalNetto
    if (s === lastTeam) return
    lastTeam = s
    cloud.publishTeam(doc)
  }
  pushTeam(useStore.getState().data)

  let timer: ReturnType<typeof setTimeout> | undefined
  let lastSaved = useStore.getState().data.updatedAt
  useStore.subscribe((s) => {
    if (s.data.updatedAt === lastSaved) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      const d = useStore.getState().data
      lastSaved = d.updatedAt
      cloud.saveState(d)
      pushTeam(d)
    }, 1500)
  })

  if (cloud.isOwner) {
    cloud.subscribeTeam(
      (members) => useCloud.setState({ members, error: null }),
      (code) => useCloud.setState({ error: code }),
    )
  }
}
