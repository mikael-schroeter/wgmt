import { useState } from 'react'
import { Check, Cloud, CloudOff } from 'lucide-react'
import { useStore, migrate } from '../store'
import { METRICS } from './Week'
import { TEAM_STEPS } from './Team'
import { Heading, Housing, NumField, Panel } from '../components/ui'
import { emptyData, type AppData } from '../lib/types'
import { fmtLong, todayKey, weekKey } from '../lib/dates'
import { dayBrutto, dayNetto, stornoOf } from '../lib/calc'

export function Goals() {
  const data = useStore((s) => s.data)
  const update = useStore((s) => s.update)
  const cloud = useStore((s) => s.cloud)

  return (
    <>
      <Housing>
        <div className="px-2 pb-1 pt-2">
          <h1 className="font-cond text-[26px] font-semibold leading-tight">Ziele</h1>
          <p className="text-[13px] opacity-75">Gewinner finden Wege.</p>
        </div>
      </Housing>
      <main className="mx-auto max-w-xl px-3 pb-28">
        <Heading>Dein Jahresziel</Heading>
        <Panel className="space-y-3 py-4">
          <TextField label="Dein Name (sieht dein Teamleiter)" value={data.profile.name} placeholder="z. B. Mikael" onCommit={(v) => update((d) => { d.profile.name = v })} />
          <TextField label="Ziel in einem Satz" value={data.goal.text} placeholder="z. B. Bis Dezember Teamleiter mit 5 VPs" onCommit={(v) => update((d) => { d.goal.text = v })} />
          <NumField label="Netto-Provision im Jahr" suffix="€" value={data.goal.nettoYear} onCommit={(v) => update((d) => { d.goal.nettoYear = v ?? null })} />
        </Panel>

        <Heading>Meilensteine</Heading>
        <Panel className="divide-y divide-line">
          {data.goal.milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={m.done}
                aria-label={`Meilenstein ${i + 1} erledigt`}
                onClick={() => update((d) => { d.goal.milestones[i].done = !d.goal.milestones[i].done })}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 ${m.done ? 'border-ok bg-ok text-white' : 'border-line'}`}
              >
                {m.done && <Check size={22} strokeWidth={3} />}
              </button>
              <div className="flex-1">
                <TextField bare label={`Meilenstein ${i + 1}`} value={m.text} placeholder="Meilenstein eintragen" onCommit={(v) => update((d) => { d.goal.milestones[i].text = v })} />
              </div>
            </div>
          ))}
        </Panel>

        <Heading>Standard-Wochenziele</Heading>
        <p className="mb-2 px-1 text-[14px] text-ink-2">Gelten für jede Woche. In der Wochenansicht kannst du einzelne Wochen anders setzen.</p>
        <Panel className="grid grid-cols-2 gap-x-3 gap-y-2 py-4">
          {METRICS.map((m) => (
            <NumField
              key={m.key}
              compact
              label={m.label}
              suffix={m.money ? '€' : m.unit}
              value={data.defaults.targets[m.key]}
              onCommit={(v) => update((d) => { d.defaults.targets[m.key] = v })}
            />
          ))}
          <NumField
            compact
            label="Storno-Quote"
            suffix="%"
            value={data.defaults.storno}
            help="Wenn eine Woche keine eigene hat"
            onCommit={(v) => update((d) => { d.defaults.storno = v == null ? null : Math.min(100, Math.max(0, v)) })}
          />
        </Panel>

        <Heading>Wochenziele Teamaufbau</Heading>
        <Panel className="grid grid-cols-2 gap-x-3 gap-y-2 py-4">
          {TEAM_STEPS.map((s) => (
            <NumField
              key={s.key}
              compact
              decimals={false}
              label={s.label}
              value={data.defaults.teamTargets[s.key]}
              onCommit={(v) => update((d) => { d.defaults.teamTargets[s.key] = v })}
            />
          ))}
        </Panel>

        <Heading>Daten</Heading>
        <Panel className="space-y-3 py-4">
          <p className="flex items-start gap-2 text-[14px] text-ink-2">
            {cloud === 'on' ? <Cloud size={18} className="mt-0.5 shrink-0 text-ok" /> : <CloudOff size={18} className="mt-0.5 shrink-0" />}
            {cloud === 'on'
              ? 'Gespeichert auf diesem Gerät und in deinem Claude-Konto. Auf jedem Gerät mit deinem Login siehst du dieselben Zahlen.'
              : cloud === 'connecting'
                ? 'Verbinde mit deinem Konto …'
                : 'Gespeichert nur auf diesem Gerät. Sichere deine Daten ab und zu über „Sicherung kopieren“.'}
          </p>
          <DataTools data={data} />
        </Panel>
      </main>
    </>
  )
}

function TextField({ label, value, onCommit, placeholder, bare }: { label: string; value: string; onCommit: (v: string) => void; placeholder?: string; bare?: boolean }) {
  const [text, setText] = useState(value)
  const [focused, setFocused] = useState(false)
  const shown = focused ? text : value
  return (
    <label className="block">
      <span className={bare ? 'sr-only' : 'block text-[14px] font-medium text-ink-2'}>{label}</span>
      <input
        value={shown}
        placeholder={placeholder}
        onFocus={() => { setText(value); setFocused(true) }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { setFocused(false); if (text !== value) onCommit(text.trim()) }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        className={`block w-full rounded-xl border-2 border-line bg-paper px-3 text-[16px] outline-none placeholder:text-ink-3/60 focus:border-ink ${bare ? 'h-11' : 'mt-1 h-12'}`}
      />
    </label>
  )
}

/** Tabellarische Tageszeilen im Aufbau der Google-Tabelle – lässt sich direkt einfügen. */
const toSheetRows = (d: AppData) => {
  const head = ['Datum', 'Stunden', 'Klingeln', 'Entscheider', 'Abrechnungen', 'Kunden', 'Zähler', 'Brutto Prov.', 'Zähler', 'Brutto Prov.', 'brutto Prov. gesamt', 'Storno-Quote in %', 'netto Prov. gesamt', 'Anmerkung']
  const num = (v?: number) => (v == null ? '' : String(v).replace('.', ','))
  const rows = Object.keys(d.days).sort().map((k) => {
    const x = d.days[k]
    return [fmtLong(k), num(x.hours), num(x.klingeln), num(x.entscheider), num(x.abrechnungen), num(x.kunden), num(x.zaehler), num(x.provD2D), num(x.zaehlerExtra), num(x.provExtra),
      num(dayBrutto(x)), num(stornoOf(d, weekKey(k))), num(Math.round(dayNetto(d, k) * 100) / 100), (x.note ?? '').replace(/\s+/g, ' ')]
  })
  return [head, ...rows].map((r) => r.join('\t')).join('\n')
}

function DataTools({ data }: { data: AppData }) {
  const replace = useStore((s) => s.replace)
  const [msg, setMsg] = useState('')
  const [mode, setMode] = useState<'none' | 'import' | 'reset'>('none')
  const [paste, setPaste] = useState('')

  const copy = async (text: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMsg(ok)
    } catch {
      setPaste(text)
      setMode('import')
      setMsg('Kopieren ist hier gesperrt. Markiere den Text unten und kopiere ihn von Hand.')
    }
  }

  const doImport = () => {
    try {
      const parsed = migrate(JSON.parse(paste))
      parsed.updatedAt = Date.now()
      replace(parsed)
      useStore.getState().update(() => {})
      setMode('none'); setPaste('')
      setMsg(`Sicherung geladen: ${Object.keys(parsed.days).length} Tage.`)
    } catch {
      setMsg('Das ist keine gültige Sicherung. Füge den kompletten Text aus „Sicherung kopieren“ ein.')
    }
  }

  const btn = 'h-12 w-full rounded-xl border-2 border-line bg-paper text-[15px] font-semibold active:bg-chalk'
  return (
    <div className="space-y-2">
      <button type="button" className={btn} onClick={() => copy(toSheetRows(data), 'Tageszeilen kopiert. In Google Tabellen in Zelle A1 eines leeren Blatts einfügen.')}>
        Für Google Tabellen kopieren
      </button>
      <button type="button" className={btn} onClick={() => copy(JSON.stringify(data), `Sicherung vom ${fmtLong(todayKey())} kopiert. Speichere sie z. B. in deinen Notizen.`)}>
        Sicherung kopieren
      </button>
      <button type="button" className={btn} onClick={() => { setMode(mode === 'import' ? 'none' : 'import'); setPaste(''); setMsg('') }}>
        Sicherung einfügen
      </button>
      {mode === 'import' && (
        <div className="space-y-2">
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={4}
            placeholder="Sicherung hier einfügen"
            className="block w-full rounded-xl border-2 border-line bg-paper px-3 py-2 text-[14px] outline-none focus:border-ink"
          />
          <button type="button" disabled={!paste.trim().startsWith('{')} onClick={doImport} className="h-12 w-full rounded-xl bg-ink text-[15px] font-semibold text-white disabled:opacity-40">
            Sicherung laden und aktuelle Daten ersetzen
          </button>
        </div>
      )}
      {mode !== 'reset' ? (
        <button type="button" className="h-12 w-full rounded-xl text-[15px] font-semibold text-bad" onClick={() => setMode('reset')}>
          Alle Daten löschen
        </button>
      ) : (
        <div className="rounded-xl bg-bad-soft p-3">
          <p className="text-[15px] font-semibold text-bad">Alle Tage, Ziele und Notizen werden gelöscht. Das lässt sich nicht rückgängig machen.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="h-12 rounded-xl bg-paper text-[15px] font-semibold" onClick={() => setMode('none')}>Abbrechen</button>
            <button
              type="button"
              className="h-12 rounded-xl bg-bad text-[15px] font-semibold text-white"
              onClick={() => { const e = emptyData(); e.updatedAt = Date.now(); replace(e); useStore.getState().update(() => {}); setMode('none'); setMsg('Alle Daten gelöscht.') }}
            >
              Endgültig löschen
            </button>
          </div>
        </div>
      )}
      {msg && <p role="status" className="text-[14px] font-medium text-ink-2">{msg}</p>}
    </div>
  )
}
