/**
 * Cloud-Anbindung.
 *
 * Läuft die App als Claude-Artifact, stellt die Umgebung `window.claude.use()` bereit:
 *  - `data/users/<id>/state` – private Sicherung der eigenen Daten (nur du siehst sie)
 *  - `team/<id>`             – Wochenzusammenfassung, die nur der Teamleiter (Owner) lesen kann
 *
 * Läuft sie eigenständig (z. B. Vercel / GitHub Pages), gibt es kein `window.claude` und
 * die App arbeitet rein lokal. Für später ist ein Supabase-Backend vorbereitet (siehe /supabase).
 */
import type { AppData } from './types'
import type { WeekSummary } from './calc'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any

export interface TeamMemberDoc {
  id: string
  label: string
  updatedAt: number
  year: number
  weeks: WeekSummary[]
  goalNetto: number | null
}

export interface Cloud {
  uid: string
  isOwner: boolean
  loadState(): Promise<AppData | null>
  saveState(d: AppData): Promise<void>
  publishTeam(doc: Omit<TeamMemberDoc, 'id'>): Promise<void>
  subscribeTeam(cb: (members: TeamMemberDoc[]) => void, onError: (code: string) => void): () => void
  names(ids: string[]): Promise<Record<string, string>>
}

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))])

/** Serialisiert Schreibvorgänge pro Dokument: immer nur einer gleichzeitig, der neueste gewinnt. */
const writer = (write: (body: Record<string, unknown>) => Promise<void>) => {
  let running = false
  let next: Record<string, unknown> | null = null
  const run = async () => {
    if (running || !next) return
    running = true
    const body = next
    next = null
    try {
      await write(body)
    } catch (e: Any) {
      if (e?.code === 'unavailable') {
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200))
        try { await write(body) } catch { /* bleibt lokal gespeichert */ }
      }
    } finally {
      running = false
      if (next) run()
    }
  }
  return (body: Record<string, unknown>) => { next = body; run() }
}

export async function connectCloud(): Promise<Cloud | null> {
  const claude: Any = (window as Any).claude
  if (!claude || typeof claude.use !== 'function') return null
  try {
    const [db, user]: Any[] = await Promise.all([withTimeout<Any>(claude.use('db'), 10_000), withTimeout<Any>(claude.use('user'), 10_000)])
    if (!db || !user) return null
    const uid: string | null = await user.id()
    if (!uid) return null
    const isOwner: boolean = await user.isOwner()
    const stateRef = db.doc(`data/users/${uid}/state`)
    const teamRef = db.doc(`team/${uid}`)
    const saveState = writer((b) => stateRef.set(b))
    const saveTeam = writer((b) => teamRef.set(b))

    return {
      uid,
      isOwner,
      async loadState() {
        const snap = await withTimeout<Any>(stateRef.get(), 10_000)
        if (!snap?.exists) return null
        const raw = snap.data()?.json
        return typeof raw === 'string' ? (JSON.parse(raw) as AppData) : null
      },
      async saveState(d) {
        // als String gespeichert: Tages-Schlüssel enthalten Bindestriche, das hält die Struktur stabil
        saveState({ json: JSON.stringify(d), updatedAt: d.updatedAt })
      },
      async publishTeam(doc) {
        saveTeam({ ...doc, weeks: JSON.stringify(doc.weeks) })
      },
      subscribeTeam(cb, onError) {
        return db.collection('team').onSnapshot(
          (qs: Any) => {
            cb(qs.docs.filter((d: Any) => d.exists).map((d: Any) => {
              const b = d.data() ?? {}
              let weeks: WeekSummary[] = []
              try { weeks = JSON.parse(String(b.weeks ?? '[]')) } catch { /* ungültig */ }
              return {
                id: d.id,
                label: String(b.label ?? '').slice(0, 60),
                updatedAt: Number(b.updatedAt) || 0,
                year: Number(b.year) || 0,
                weeks: Array.isArray(weeks) ? weeks : [],
                goalNetto: typeof b.goalNetto === 'number' ? b.goalNetto : null,
              } satisfies TeamMemberDoc
            }))
          },
          (e: Any) => onError(String(e?.code ?? 'unavailable')),
        )
      },
      async names(ids) {
        if (!ids.length) return {}
        const ps = await user.profiles(ids)
        const out: Record<string, string> = {}
        for (const id of ids) out[id] = ps?.[id]?.name || ''
        return out
      },
    }
  } catch {
    return null
  }
}
