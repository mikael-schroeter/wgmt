import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useStore } from '../store'
import { addDays, fmtDayMonth, fmtWeekday, fmtWeekRange, mondayOfWeek, weekDays, weekKey, weekNo, todayKey } from '../lib/dates'
import {
  ampel, dayBrutto, dayNetto, effectiveTargets, isStornoSet, stornoLight, stornoOf, TOP_DAY_PROV, TOP_WEEK_NETTO, weekTotals,
} from '../lib/calc'
import { fmtEur, fmtNum } from '../lib/format'
import { Bar, Dot, Heading, Housing, lightSoft, lightText, lightWord, NumField, Panel, Stepper } from '../components/ui'
import type { MetricKey } from '../lib/types'

export const METRICS: { key: MetricKey; label: string; money?: boolean; unit?: string }[] = [
  { key: 'hours', label: 'Stunden', unit: 'h' },
  { key: 'klingeln', label: 'Klingeln' },
  { key: 'entscheider', label: 'Entscheider' },
  { key: 'abrechnungen', label: 'Abrechnungen' },
  { key: 'kunden', label: 'Kunden' },
  { key: 'zaehler', label: 'Zähler D2D' },
  { key: 'provD2D', label: 'Brutto D2D', money: true },
  { key: 'zaehlerExtra', label: 'Zähler abseits D2D' },
  { key: 'provExtra', label: 'Brutto abseits D2D', money: true },
  { key: 'brutto', label: 'Brutto gesamt', money: true },
  { key: 'netto', label: 'Netto gesamt', money: true },
]

export function Week() {
  const data = useStore((s) => s.data)
  const date = useStore((s) => s.date)
  const setDate = useStore((s) => s.setDate)
  const setTab = useStore((s) => s.setTab)
  const patchWeek = useStore((s) => s.patchWeek)
  const [editTargets, setEditTargets] = useState(false)

  const wk = weekKey(date)
  const t = weekTotals(data, wk)
  const targets = effectiveTargets(data, wk)
  const storno = stornoOf(data, wk)
  const stornoSet = isStornoSet(data, wk)
  const nettoLight = ampel(t.netto, targets.netto)
  const days = weekDays(mondayOfWeek(wk))
  const own = data.weeks[wk]?.targets ?? {}

  return (
    <>
      <Housing>
        <Stepper
          title={`KW ${weekNo(wk)}`}
          sub={fmtWeekRange(wk)}
          onPrev={() => setDate(addDays(date, -7))}
          onNext={() => setDate(addDays(date, 7))}
        />
      </Housing>
      <main className="mx-auto max-w-xl px-3 pb-28">
        {/* Wochenergebnis */}
        <section className="mt-3 rounded-2xl bg-paper px-4 py-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[15px] font-semibold text-ink-2">Netto diese Woche</span>
            {t.netto >= TOP_WEEK_NETTO && <span className="rounded-full bg-volt px-2.5 py-0.5 text-[13px] font-semibold">über {fmtEur(TOP_WEEK_NETTO)}</span>}
          </div>
          <div className={`num mt-1 text-[56px] font-bold leading-none ${lightText(nettoLight)}`}>{fmtEur(t.netto)}</div>
          <div className="mt-2 text-[15px] text-ink-2">
            {targets.netto ? (
              <span className="flex flex-wrap items-center gap-2">
                Ziel {fmtEur(targets.netto)}
                {nettoLight !== 'none' && <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${lightSoft(nettoLight)} ${lightText(nettoLight)}`}>{lightWord(nettoLight)}</span>}
              </span>
            ) : 'Noch kein Netto-Wochenziel gesetzt'}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[13px] text-ink-3">Brutto</div>
              <div className="num text-[26px] font-semibold leading-tight">{fmtEur(t.brutto)}</div>
            </div>
            <div>
              <NumField
                compact
                label="Storno-Quote"
                suffix="%"
                value={data.weeks[wk]?.storno ?? null}
                placeholder={data.defaults.storno != null ? String(data.defaults.storno).replace('.', ',') : '0'}
                onCommit={(v) => patchWeek(wk, { storno: v == null ? null : Math.min(100, Math.max(0, v)) })}
              />
            </div>
          </div>
          {stornoSet && (
            <p className={`mt-2 flex items-center gap-2 text-[14px] font-medium ${lightText(stornoLight(storno, true))}`}>
              <Dot light={stornoLight(storno, true)} />
              {storno >= 40 ? 'Storno kritisch: ab 40 %' : storno >= 35 ? 'Storno im Warnbereich: 35 bis 40 %' : 'Storno im grünen Bereich'}
              {data.weeks[wk]?.storno == null && ' (Standardwert)'}
            </p>
          )}
        </section>

        {/* Kennzahlen gegen Ziel */}
        <Heading
          aside={
            <button type="button" onClick={() => setEditTargets((v) => !v)} className="flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-ink-2 active:bg-paper">
              <Pencil size={16} /> {editTargets ? 'Fertig' : 'Ziele dieser Woche'}
            </button>
          }
        >
          Wochenergebnis
        </Heading>
        <Panel className="divide-y divide-line">
          {METRICS.map((m) => {
            const v = t[m.key]
            const target = targets[m.key]
            const l = ampel(v, target)
            const fmt = (x: number) => (m.money ? fmtEur(x) : fmtNum(x))
            return (
              <div key={m.key} className="py-3">
                <div className="flex items-baseline gap-2">
                  <Dot light={l} />
                  <span className="flex-1 text-[16px] font-medium">{m.label}</span>
                  <span className={`num text-[22px] font-semibold ${lightText(l)}`}>{fmt(v)}</span>
                  <span className="num w-20 text-right text-[16px] text-ink-3">{target ? `/ ${fmt(target)}` : ''}</span>
                </div>
                {target ? <div className="mt-1.5"><Bar value={v} target={target} light={l} /></div> : null}
                {editTargets && (
                  <div className="mt-2">
                    <NumField
                      compact
                      label={own[m.key] != null ? 'Ziel nur für diese Woche' : `Ziel diese Woche (Standard: ${data.defaults.targets[m.key] != null ? fmt(data.defaults.targets[m.key]!) : 'keins'})`}
                      suffix={m.money ? '€' : m.unit}
                      value={own[m.key]}
                      onCommit={(nv) => patchWeek(wk, { targets: { ...own, [m.key]: nv } })}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </Panel>

        {/* Tage */}
        <Heading>Tage</Heading>
        <Panel className="divide-y divide-line">
          {days.map((k) => {
            const d = data.days[k]
            const brutto = dayBrutto(d)
            const isToday = k === todayKey()
            return (
              <button
                key={k}
                type="button"
                onClick={() => { setDate(k); setTab('heute') }}
                className="flex w-full items-center gap-3 py-3 text-left active:bg-chalk"
              >
                <span className={`w-12 shrink-0 ${isToday ? 'text-ink' : 'text-ink-2'}`}>
                  <span className="block font-cond text-[20px] font-semibold leading-none">{fmtWeekday(k)}</span>
                  <span className="text-[13px]">{fmtDayMonth(k)}</span>
                </span>
                <span className="min-w-0 flex-1 text-[14px] text-ink-2">
                  {d ? (
                    <>
                      <span className="num text-[17px] font-semibold text-ink">{d.klingeln ?? 0}</span> Klingeln,{' '}
                      <span className="num text-[17px] font-semibold text-ink">{d.kunden ?? 0}</span> Kunden
                      {d.note && <span className="block truncate text-ink-3">{d.note}</span>}
                    </>
                  ) : (
                    <span className="text-ink-3">Nichts eingetragen</span>
                  )}
                </span>
                <span className="text-right">
                  <span className={`num block text-[19px] font-semibold ${brutto >= TOP_DAY_PROV ? 'rounded bg-volt px-1.5' : ''}`}>{fmtEur(dayNetto(data, k))}</span>
                  <span className="text-[12px] text-ink-3">netto</span>
                </span>
              </button>
            )
          })}
        </Panel>
      </main>
    </>
  )
}
