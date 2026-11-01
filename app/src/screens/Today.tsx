import { useStore } from '../store'
import { addDays, fmtDayMonth, fmtWeekdayLong, todayKey, weekKey, weekNo } from '../lib/dates'
import { dayBrutto, dayNetto, quotes, sumDays, TOP_DAY_PROV, isStornoSet, stornoOf } from '../lib/calc'
import { fmtEur, fmtPct, fmtRatio } from '../lib/format'
import { CounterRow, Heading, Housing, NumField, Panel, Stepper, TextArea } from '../components/ui'
import type { D2DCountKey } from '../lib/types'

export function DateHeader() {
  const date = useStore((s) => s.date)
  const setDate = useStore((s) => s.setDate)
  const isToday = date === todayKey()
  return (
    <Housing>
      <Stepper
        title={isToday ? `Heute, ${fmtDayMonth(date)}` : `${fmtWeekdayLong(date)}, ${fmtDayMonth(date)}`}
        sub={`KW ${weekNo(weekKey(date))}`}
        onPrev={() => setDate(addDays(date, -1))}
        onNext={() => setDate(addDays(date, 1))}
      />
      {!isToday && (
        <div className="flex justify-center pb-1">
          <button type="button" onClick={() => setDate(todayKey())} className="h-9 rounded-full bg-white/12 px-4 text-[14px] font-semibold">
            Zu heute springen
          </button>
        </div>
      )}
    </Housing>
  )
}

const COUNTS: { key: D2DCountKey; label: string }[] = [
  { key: 'klingeln', label: 'Klingeln' },
  { key: 'entscheider', label: 'Entscheider' },
  { key: 'abrechnungen', label: 'Abrechnungen' },
  { key: 'kunden', label: 'Kunden' },
  { key: 'zaehler', label: 'Zähler' },
]

export function Today() {
  const data = useStore((s) => s.data)
  const date = useStore((s) => s.date)
  const bump = useStore((s) => s.bumpDay)
  const patch = useStore((s) => s.patchDay)
  const day = data.days[date] ?? {}
  const t = sumDays(data, [date])
  const q = quotes(t)
  const wk = weekKey(date)
  const brutto = dayBrutto(day)
  const netto = dayNetto(data, date)
  const stornoSet = isStornoSet(data, wk)

  const hints: Record<D2DCountKey, string | undefined> = {
    klingeln: q.klingelnProStunde != null ? `${fmtRatio(q.klingelnProStunde)} pro Stunde` : 'Jede Tür zählt',
    entscheider: q.entscheiderQuote != null ? `${fmtPct(q.entscheiderQuote)} der Klingeln` : undefined,
    abrechnungen: q.rechnungsQuote != null ? `${fmtPct(q.rechnungsQuote)} der Entscheider` : 'Strom- oder Gasrechnung gesehen',
    kunden: q.abschlussQuote != null ? `${fmtPct(q.abschlussQuote)} der Rechnungen` : undefined,
    zaehler: q.zaehlerProKunde != null ? `${fmtRatio(q.zaehlerProKunde)} pro Kunde` : undefined,
  }

  return (
    <>
      <DateHeader />
      <main className="mx-auto max-w-xl px-3 pb-28">
        <Heading>An der Tür</Heading>
        <Panel className="divide-y divide-line">
          {COUNTS.map((c) => (
            <CounterRow key={c.key} label={c.label} hint={hints[c.key]} value={day[c.key] ?? 0} onBump={(d) => bump(date, c.key, d)} />
          ))}
          <CounterRow
            label="Stunden"
            hint={q.euroProStunde != null ? `${fmtEur(q.euroProStunde)} pro Stunde` : 'in halben Stunden'}
            value={day.hours ?? 0}
            step={0.5}
            digits={3}
            decimal
            onBump={(d) => bump(date, 'hours', d)}
          />
        </Panel>

        <Heading aside={brutto >= TOP_DAY_PROV ? <span className="rounded-full bg-volt px-2.5 py-0.5 text-[13px] font-semibold">Top-Tag</span> : null}>
          Provision
        </Heading>
        <Panel className="py-3">
          <NumField label="Brutto aus D2D" suffix="€" value={day.provD2D} onCommit={(v) => patch(date, { provD2D: v })} />
          <p className="mt-4 text-[14px] font-semibold text-ink-2">Abseits von D2D: Empfehlungen, Bestandskunden</p>
          <div className="mt-1 grid grid-cols-2 gap-3">
            <NumField compact label="Zähler" value={day.zaehlerExtra} decimals={false} onCommit={(v) => patch(date, { zaehlerExtra: v })} />
            <NumField compact label="Brutto" suffix="€" value={day.provExtra} onCommit={(v) => patch(date, { provExtra: v })} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3">
            <div>
              <dt className="text-[13px] text-ink-3">Brutto gesamt</dt>
              <dd className="num text-[28px] font-semibold leading-tight">{fmtEur(brutto, true)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-3">
                Netto {stornoSet ? `(Storno ${fmtRatio(stornoOf(data, wk), 1)} %)` : '(ohne Storno)'}
              </dt>
              <dd className="num text-[28px] font-semibold leading-tight">{fmtEur(netto, true)}</dd>
            </div>
          </dl>
        </Panel>

        <Heading>Notiz</Heading>
        <Panel className="py-3">
          <TextArea
            label="Gedanken, Gefühle, Learnings"
            placeholder="Was lief heute gut? Was machst du morgen anders?"
            value={day.note}
            onCommit={(v) => patch(date, { note: v || undefined })}
          />
        </Panel>
      </main>
    </>
  )
}
