import { useState } from 'react'
import { useStore } from '../store'
import { addDays, mondayOf, mondayOfWeek, weekDays, weekKey, weekNo, weeksOfYear, type WeekKey } from '../lib/dates'
import { effectiveTargets, quotes, sumDays, weekTotals, yearTotals, type Totals } from '../lib/calc'
import { fmtEur, fmtNum, fmtPct, fmtRatio } from '../lib/format'
import { Heading, Housing, Panel, Segmented } from '../components/ui'

type Range = 'woche' | '4w' | 'jahr'

export function Stats() {
  const data = useStore((s) => s.data)
  const date = useStore((s) => s.date)
  const [range, setRange] = useState<Range>('4w')
  const wk = weekKey(date)
  const year = Number(wk.slice(0, 4))

  let t: Totals
  if (range === 'woche') t = weekTotals(data, wk)
  else if (range === '4w') {
    const mo = mondayOf(date)
    const keys = Array.from({ length: 4 }, (_, i) => weekDays(addDays(mo, -7 * i))).flat()
    t = sumDays(data, keys)
  } else t = yearTotals(data, year)
  const q = quotes(t)

  return (
    <>
      <Housing>
        <div className="px-2 pb-1 pt-2">
          <h1 className="font-cond text-[26px] font-semibold leading-tight">Quoten und Auswertung</h1>
          <p className="text-[13px] opacity-75">Bis KW {weekNo(wk)}/{year}</p>
        </div>
      </Housing>
      <main className="mx-auto max-w-xl px-3 pb-28">
        <div className="mt-3">
          <Segmented
            value={range}
            onChange={setRange}
            options={[{ value: 'woche', label: 'Diese Woche' }, { value: '4w', label: '4 Wochen' }, { value: 'jahr', label: String(year) }]}
          />
        </div>

        <Heading>Vom Klingeln zum Zähler</Heading>
        <Funnel t={t} />

        <Heading>Effizienz</Heading>
        <Panel className="grid grid-cols-2 gap-x-4 gap-y-4 py-4">
          <Kpi label="Provision pro Stunde" value={q.euroProStunde != null ? fmtEur(q.euroProStunde) : '–'} />
          <Kpi label="Klingeln pro Stunde" value={fmtRatio(q.klingelnProStunde)} />
          <Kpi label="Klingeln pro Kunde" value={fmtRatio(q.klingelnProKunde, 0)} />
          <Kpi label="Provision pro Klingeln" value={q.euroProKlingeln != null ? fmtEur(q.euroProKlingeln, true) : '–'} />
          <Kpi label="Zähler pro Kunde" value={fmtRatio(q.zaehlerProKunde, 2)} />
          <Kpi label="Provision pro Zähler" value={q.euroProZaehler != null ? fmtEur(q.euroProZaehler) : '–'} />
          <Kpi label="Kunden pro Entscheider" value={fmtPct(q.kundenProEntscheider)} />
          <Kpi label="Stunden gesamt" value={fmtNum(t.hours)} />
        </Panel>

        <WeeklyChart year={year} current={wk} />
        <YearGoal year={year} current={wk} />
      </main>
    </>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[13px] leading-tight text-ink-3">{label}</div>
      <div className="num text-[28px] font-semibold leading-tight">{value}</div>
    </div>
  )
}

/** Trichter: echte Abfolge, deshalb Schritte mit Übergangsquote dazwischen. */
function Funnel({ t }: { t: Totals }) {
  const steps = [
    { label: 'Klingeln', v: t.klingeln },
    { label: 'Entscheider', v: t.entscheider },
    { label: 'Abrechnungen', v: t.abrechnungen },
    { label: 'Kunden', v: t.kunden },
    { label: 'Zähler', v: t.zaehler },
  ]
  const max = Math.max(1, ...steps.map((s) => s.v))
  if (t.klingeln === 0 && t.kunden === 0) {
    return <Panel className="py-5 text-[15px] text-ink-2">Trag unter „Heute“ deine Klingeln, Entscheider und Kunden ein. Hier siehst du dann, wo im Gespräch die meisten abspringen.</Panel>
  }
  return (
    <Panel className="py-3">
      {steps.map((s, i) => {
        const prev = steps[i - 1]
        const conv = prev && prev.v > 0 ? s.v / prev.v : null
        return (
          <div key={s.label}>
            {i > 0 && (
              <div className="flex items-center gap-2 py-1 pl-1 text-[13px] text-ink-3">
                <span aria-hidden className="h-3 w-px bg-line" />
                {conv == null ? '–' : i === 4
                  ? <span><span className="num text-[16px] font-semibold text-ink-2">{fmtRatio(conv, 2)}</span> Zähler je Kunde</span>
                  : <span><span className="num text-[16px] font-semibold text-ink-2">{fmtPct(conv)}</span> kommen weiter</span>}
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-[15px] font-medium">{s.label}</span>
              <div className="h-7 flex-1 overflow-hidden rounded-md bg-chalk">
                <div className={`h-full rounded-md ${i === 3 ? 'bg-volt' : 'bg-ink'}`} style={{ width: `${Math.max(2, (s.v / max) * 100)}%` }} />
              </div>
              <span className="num w-14 text-right text-[22px] font-semibold">{fmtNum(s.v)}</span>
            </div>
          </div>
        )
      })}
    </Panel>
  )
}

function WeeklyChart({ year, current }: { year: number; current: WeekKey }) {
  const data = useStore((s) => s.data)
  const setDate = useStore((s) => s.setDate)
  const setTab = useStore((s) => s.setTab)
  const all = weeksOfYear(year)
  const idx = Math.max(0, all.indexOf(current))
  const weeks = all.slice(Math.max(0, idx - 11), idx + 1)
  const rows = weeks.map((w) => ({ w, netto: weekTotals(data, w).netto, target: effectiveTargets(data, w).netto }))
  const max = Math.max(1, ...rows.map((r) => Math.max(r.netto, r.target ?? 0)))
  const best = rows.reduce((a, b) => (b.netto > a.netto ? b : a), rows[0])
  const H = 140

  return (
    <>
      <Heading aside={best?.netto > 0 ? <span className="text-[13px] text-ink-3">Beste: KW {weekNo(best.w)}, {fmtEur(best.netto)}</span> : null}>
        Netto pro Woche
      </Heading>
      <Panel className="py-4">
        <div className="flex items-end gap-1.5" style={{ height: H }}>
          {rows.map((r) => {
            const h = (r.netto / max) * H
            const reached = r.target ? r.netto >= r.target : false
            return (
              <button
                key={r.w}
                type="button"
                aria-label={`KW ${weekNo(r.w)}: ${fmtEur(r.netto)} netto${r.target ? `, Ziel ${fmtEur(r.target)}` : ''}`}
                onClick={() => { setDate(mondayOfWeek(r.w)); setTab('woche') }}
                className="relative flex h-full flex-1 items-end"
              >
                {r.target ? <span aria-hidden className="absolute inset-x-0 border-t-2 border-dashed border-ink-3" style={{ bottom: (r.target / max) * H }} /> : null}
                <span
                  className={`w-full rounded-t-[4px] ${r.w === current ? 'bg-volt' : reached ? 'bg-ok' : 'bg-ink'}`}
                  style={{ height: Math.max(r.netto > 0 ? 3 : 1, h) }}
                />
              </button>
            )
          })}
        </div>
        <div className="mt-1 flex gap-1.5">
          {rows.map((r) => (
            <span key={r.w} className="num flex-1 text-center text-[12px] text-ink-3">{weekNo(r.w)}</span>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-ink-3">Grün: Wochenziel erreicht. Gestrichelt: Ziel. Tippen öffnet die Woche.</p>
      </Panel>
    </>
  )
}

function YearGoal({ year, current }: { year: number; current: WeekKey }) {
  const data = useStore((s) => s.data)
  const setTab = useStore((s) => s.setTab)
  const t = yearTotals(data, year)
  const goal = data.goal.nettoYear
  const all = weeksOfYear(year)
  const left = Math.max(0, all.length - all.indexOf(current) - 1)
  const pct = goal ? Math.min(1, t.netto / goal) : 0
  const perWeek = goal && left > 0 ? Math.max(0, goal - t.netto) / left : null

  return (
    <>
      <Heading>Jahresziel {year}</Heading>
      <Panel className="py-4">
        {data.goal.text && <p className="mb-3 font-cond text-[22px] font-semibold leading-tight">{data.goal.text}</p>}
        {goal ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="num text-[34px] font-bold leading-none">{fmtEur(t.netto)}</span>
              <span className="num text-[18px] text-ink-3">von {fmtEur(goal)}</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-chalk">
              <div className="h-full rounded-full bg-volt" style={{ width: `${pct * 100}%` }} />
            </div>
            <p className="mt-2 text-[15px] text-ink-2">
              {t.netto >= goal
                ? 'Jahresziel erreicht.'
                : perWeek != null
                  ? <>Noch <b className="num text-[17px]">{fmtEur(perWeek)}</b> netto pro Woche in den restlichen {left} Wochen.</>
                  : 'Das Jahr ist vorbei.'}
            </p>
          </>
        ) : (
          <button type="button" onClick={() => setTab('ziele')} className="h-12 w-full rounded-xl border-2 border-dashed border-line text-[15px] font-semibold text-ink-2">
            Netto-Jahresziel festlegen
          </button>
        )}
        {data.goal.milestones.some((m) => m.text) && (
          <ul className="mt-4 space-y-1.5 border-t border-line pt-3">
            {data.goal.milestones.filter((m) => m.text).map((m, i) => (
              <li key={i} className={`flex items-start gap-2 text-[15px] ${m.done ? 'text-ink-3 line-through' : ''}`}>
                <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${m.done ? 'bg-ok' : 'border-2 border-ink-3'}`} />
                {m.text}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
