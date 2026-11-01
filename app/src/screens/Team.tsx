import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { useCloud } from '../sync'
import { MONTHS, mondayOfWeek, todayKey, weekDays, weekKey, weekNo } from '../lib/dates'
import { ampel, effectiveTeamTargets, quotes, sumTeam, type WeekSummary } from '../lib/calc'
import { fmtEur, fmtNum, fmtPct } from '../lib/format'
import { Bar, CounterRow, Dot, Heading, lightText, NumField, Panel, Segmented, TextArea } from '../components/ui'
import { DateHeader } from './Today'
import type { TeamKey } from '../lib/types'

export const TEAM_STEPS: { key: TeamKey; label: string }[] = [
  { key: 'gepitcht', label: 'Kandidaten gepitcht' },
  { key: 'terminiert', label: 'Kandidaten terminiert' },
  { key: 'praesentiert', label: 'Kandidaten präsentiert' },
  { key: 'registriert', label: 'VPs registriert' },
  { key: 'folgetermin', label: 'Folgetermin 1 stattgefunden' },
]

export function Team() {
  const [view, setView] = useState<'aufbau' | 'team'>('aufbau')
  return (
    <>
      {view === 'aufbau' ? <DateHeader /> : (
        <header className="pt-safe sticky top-0 z-20 bg-ink px-4 pb-3 pt-2 text-white">
          <h1 className="font-cond text-[26px] font-semibold leading-tight">Mein Team</h1>
          <p className="text-[13px] opacity-75">Zahlen deiner VPs, KW {weekNo(weekKey(todayKey()))}</p>
        </header>
      )}
      <main className="mx-auto max-w-xl px-3 pb-28">
        <div className="mt-3">
          <Segmented value={view} onChange={setView} options={[{ value: 'aufbau', label: 'Teamaufbau' }, { value: 'team', label: 'Mein Team' }]} />
        </div>
        {view === 'aufbau' ? <Recruiting /> : <Members />}
      </main>
    </>
  )
}

function Recruiting() {
  const data = useStore((s) => s.data)
  const date = useStore((s) => s.date)
  const bump = useStore((s) => s.bumpTeam)
  const patch = useStore((s) => s.patchTeamDay)
  const patchMonth = useStore((s) => s.patchMonth)
  const day = data.teamDays[date] ?? {}
  const wk = weekKey(date)
  const week = sumTeam(data.teamDays, weekDays(mondayOfWeek(wk)))
  const targets = effectiveTeamTargets(data, wk)
  const year = Number(wk.slice(0, 4))

  return (
    <>
      <Heading>Heute im Recruiting</Heading>
      <Panel className="divide-y divide-line">
        {TEAM_STEPS.map((s) => (
          <CounterRow key={s.key} label={s.label} value={day[s.key] ?? 0} onBump={(d) => bump(date, s.key, d)} />
        ))}
      </Panel>

      <Heading>KW {weekNo(wk)} gegen Ziel</Heading>
      <Panel className="divide-y divide-line">
        {TEAM_STEPS.map((s, i) => {
          const v = week[s.key]
          const target = targets[s.key]
          const l = ampel(v, target)
          const prev = i > 0 ? week[TEAM_STEPS[i - 1].key] : 0
          return (
            <div key={s.key} className="py-3">
              <div className="flex items-baseline gap-2">
                <Dot light={l} />
                <span className="flex-1 text-[16px] font-medium">{s.label}</span>
                <span className={`num text-[22px] font-semibold ${lightText(l)}`}>{v}</span>
                <span className="num w-14 text-right text-[16px] text-ink-3">{target ? `/ ${target}` : ''}</span>
              </div>
              {i > 0 && prev > 0 && <div className="text-[13px] text-ink-3">{fmtPct(v / prev)} vom Schritt davor</div>}
              {target ? <div className="mt-1.5"><Bar value={v} target={target} light={l} /></div> : null}
            </div>
          )
        })}
      </Panel>

      <Heading>Notiz zum Teamaufbau</Heading>
      <Panel className="py-3">
        <TextArea label="Kandidaten, Eindrücke, nächste Schritte" value={day.note} onCommit={(v) => patch(date, { note: v || undefined })} />
      </Panel>

      <Heading>Monate {year}</Heading>
      <Panel className="py-2">
        <div className="grid grid-cols-[1fr_5.5rem_5.5rem] items-end gap-x-3 pb-1 text-[13px] font-medium text-ink-3">
          <span>Monat</span><span>VPs</span><span>Aufträge</span>
        </div>
        {MONTHS.map((m, i) => {
          const key = `${year}-${String(i + 1).padStart(2, '0')}`
          const v = data.months[key] ?? {}
          return (
            <div key={key} className="grid grid-cols-[1fr_5.5rem_5.5rem] items-center gap-x-3 border-t border-line py-1.5">
              <span className="text-[15px] font-medium">{m}</span>
              <NumField compact hideLabel label={`VPs ${m}`} value={v.vps} decimals={false} onCommit={(x) => patchMonth(key, { vps: x })} />
              <NumField compact hideLabel label={`Aufträge ${m}`} value={v.auftraege} decimals={false} onCommit={(x) => patchMonth(key, { auftraege: x })} />
            </div>
          )
        })}
      </Panel>
    </>
  )
}

function Members() {
  const { cloud, members, error, names, loadNames } = useCloud()
  const [sel, setSel] = useState<string | null>(null)
  const ids = members.map((m) => m.id).join(',')
  useEffect(() => { if (ids) loadNames(ids.split(',')) }, [ids, loadNames])

  if (!cloud) {
    return (
      <Panel className="mt-4 space-y-3 py-4 text-[15px] text-ink-2">
        <p className="font-semibold text-ink">Die Team-Ansicht braucht die geteilte Version der App.</p>
        <p>Teile diese App in Claude mit deinen VPs mit dem Recht „Mitwirken“. Jeder trägt seine Zahlen ein, die Wochensummen erscheinen dann hier bei dir. Einzelne Tage und Notizen bleiben privat.</p>
        <p>Ein eigenes Team-Backend mit Login ist vorbereitet und lässt sich später anschließen.</p>
      </Panel>
    )
  }
  if (!cloud.isOwner) {
    return (
      <Panel className="mt-4 space-y-3 py-4 text-[15px] text-ink-2">
        <p className="font-semibold text-ink">Deine Wochensummen gehen automatisch an deinen Teamleiter.</p>
        <p>Geteilt werden nur Summen pro Woche: Stunden, Klingeln, Entscheider, Abrechnungen, Kunden, Zähler, Provision, Storno und deine Recruiting-Zahlen. Einzelne Tage und Notizen bleiben bei dir.</p>
        <p>Trag unter „Ziele“ deinen Namen ein, damit er dich erkennt.</p>
      </Panel>
    )
  }
  if (error) return <Panel className="mt-4 py-4 text-[15px] text-bad">Teamdaten sind gerade nicht erreichbar. Deine eigenen Zahlen sind sicher gespeichert.</Panel>

  const wk = weekKey(todayKey())
  const rows = members
    .map((m) => ({ m, cur: m.weeks.find((w) => w.wk === wk), name: names[m.id] || m.label || (m.id === cloud.uid ? 'Du' : 'VP ohne Namen') }))
    .sort((a, b) => (b.cur?.t.netto ?? 0) - (a.cur?.t.netto ?? 0))
  const total = rows.reduce((acc, r) => {
    acc.netto += r.cur?.t.netto ?? 0
    acc.kunden += r.cur?.t.kunden ?? 0
    acc.klingeln += r.cur?.t.klingeln ?? 0
    acc.registriert += r.cur?.team.registriert ?? 0
    return acc
  }, { netto: 0, kunden: 0, klingeln: 0, registriert: 0 })

  if (!members.length) {
    return (
      <Panel className="mt-4 space-y-3 py-4 text-[15px] text-ink-2">
        <p className="font-semibold text-ink">Noch niemand aus deinem Team ist dabei.</p>
        <p>Teile die App in Claude über „Teilen“ mit deinen VPs und gib ihnen das Recht „Mitwirken“. Sobald jemand etwas einträgt, erscheint er hier.</p>
      </Panel>
    )
  }

  return (
    <>
      <Heading>Team diese Woche</Heading>
      <Panel className="grid grid-cols-2 gap-4 py-4">
        <Stat label="Netto gesamt" value={fmtEur(total.netto)} />
        <Stat label="Kunden" value={fmtNum(total.kunden)} />
        <Stat label="Klingeln" value={fmtNum(total.klingeln)} />
        <Stat label="Neue VPs" value={fmtNum(total.registriert)} />
      </Panel>

      <Heading>VPs, nach Netto</Heading>
      <Panel className="divide-y divide-line">
        {rows.map(({ m, cur, name }) => {
          const l = ampel(cur?.t.netto ?? 0, cur?.targets.netto)
          const open = sel === m.id
          return (
            <div key={m.id}>
              <button type="button" onClick={() => setSel(open ? null : m.id)} aria-expanded={open} className="flex w-full items-center gap-3 py-3 text-left">
                <Dot light={l} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold">{name}</span>
                  <span className="text-[13px] text-ink-3">
                    {cur ? `${cur.t.klingeln} Klingeln, ${cur.t.kunden} Kunden, ${fmtPct(quotes(cur.t).entscheiderQuote)} Entscheider` : 'Diese Woche noch nichts'}
                  </span>
                </span>
                <span className={`num text-[22px] font-semibold ${lightText(l)}`}>{fmtEur(cur?.t.netto ?? 0)}</span>
              </button>
              {open && <MemberDetail weeks={m.weeks} />}
            </div>
          )
        })}
      </Panel>
      <p className="mt-2 px-1 text-[13px] text-ink-3">Nur du als Besitzer der App siehst diese Liste.</p>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[13px] text-ink-3">{label}</div>
      <div className="num text-[28px] font-semibold leading-tight">{value}</div>
    </div>
  )
}

function MemberDetail({ weeks }: { weeks: WeekSummary[] }) {
  const last = [...weeks].sort((a, b) => b.wk.localeCompare(a.wk)).slice(0, 6)
  if (!last.length) return <p className="pb-3 text-[14px] text-ink-3">Noch keine Wochen.</p>
  return (
    <div className="pb-3">
      <div className="grid grid-cols-[3rem_1fr_1fr_1fr_1fr] gap-x-2 text-[12px] font-medium text-ink-3">
        <span>KW</span><span>Klingeln</span><span>Kunden</span><span>Storno</span><span className="text-right">Netto</span>
      </div>
      {last.map((w) => (
        <div key={w.wk} className="num grid grid-cols-[3rem_1fr_1fr_1fr_1fr] gap-x-2 border-t border-line py-1 text-[17px]">
          <span>{weekNo(w.wk)}</span>
          <span>{w.t.klingeln}</span>
          <span>{w.t.kunden}</span>
          <span>{fmtNum(w.storno)} %</span>
          <span className={`text-right font-semibold ${lightText(ampel(w.t.netto, w.targets.netto))}`}>{fmtEur(w.t.netto)}</span>
        </div>
      ))}
    </div>
  )
}
