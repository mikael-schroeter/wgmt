import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import type { Light } from '../lib/calc'
import { parseNum, toInput } from '../lib/format'

/* ------------------------------------------------------------------ Zahl */

/** Große, ruhige Zahl für die Zähler. Bei `decimal` mit einer Nachkommastelle (Stunden). */
export function Meter({ value, label, decimal }: { value: number; label?: string; decimal?: boolean }) {
  const v = Math.max(0, value)
  const text = decimal ? v.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : String(Math.floor(v))
  const prev = useRef(v)
  const dir = v >= prev.current ? 'roll-up' : 'roll-down'
  useEffect(() => { prev.current = v }, [v])
  return (
    <span
      role="img"
      aria-label={`${label ? label + ': ' : ''}${text}`}
      className={`num inline-block min-w-[3.25rem] shrink-0 overflow-hidden text-right text-[36px] font-bold leading-none ${v === 0 ? 'text-ink-3/50' : 'text-ink'}`}
    >
      <span key={text} className={`inline-block ${dir}`}>{text}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ Zähler-Zeile */

export function CounterRow({
  label, hint, value, onBump, step = 1, decimal,
}: {
  label: string
  hint?: ReactNode
  value: number
  onBump: (delta: number) => void
  step?: number
  decimal?: boolean
}) {
  const vibrate = () => { try { navigator.vibrate?.(8) } catch { /* nicht unterstützt */ } }
  return (
    <div className="flex items-center gap-2 py-3">
      <div className="min-w-0 flex-1 hyphens-auto break-words" lang="de">
        <div className="text-[16px] font-semibold leading-tight">{label}</div>
        {hint && <div className="mt-0.5 text-[13px] leading-tight text-ink-3">{hint}</div>}
      </div>
      <Meter value={value} label={label} decimal={decimal} />
      <button
        type="button"
        aria-label={`${label} minus ${step}`}
        onClick={() => { vibrate(); onBump(-step) }}
        disabled={value <= 0}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-line text-ink-2 active:bg-line disabled:opacity-35"
      >
        <Minus size={20} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        aria-label={`${label} plus ${step}`}
        onClick={() => { vibrate(); onBump(step) }}
        className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-volt text-ink shadow-[0_2px_0_#B89300] active:translate-y-[2px] active:shadow-none"
      >
        <Plus size={28} strokeWidth={3} />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ Zahleneingabe */

export function NumField({
  label, value, onCommit, suffix, placeholder, help, decimals = true, compact, hideLabel,
}: {
  label: string
  value: number | null | undefined
  onCommit: (v: number | undefined) => void
  suffix?: string
  placeholder?: string
  help?: string
  decimals?: boolean
  compact?: boolean
  hideLabel?: boolean
}) {
  const [text, setText] = useState(toInput(value))
  const focused = useRef(false)
  useEffect(() => { if (!focused.current) setText(toInput(value)) }, [value])
  const commit = () => {
    const v = parseNum(text)
    const rounded = v == null ? undefined : decimals ? Math.round(v * 100) / 100 : Math.round(v)
    if (rounded !== (value ?? undefined)) onCommit(rounded)
    setText(toInput(rounded))
  }
  const id = useId()
  return (
    <label htmlFor={id} className={`block ${compact ? '' : 'py-1'}`}>
      <span className={hideLabel ? 'sr-only' : `block font-medium text-ink-2 ${compact ? 'text-[13px]' : 'text-[14px]'}`}>{label}</span>
      <span className={`${hideLabel ? '' : 'mt-1'} flex items-center rounded-xl border-2 border-line bg-paper focus-within:border-ink`}>
        <input
          id={id}
          inputMode={decimals ? 'decimal' : 'numeric'}
          enterKeyHint="done"
          value={text}
          placeholder={placeholder ?? '0'}
          onFocus={(e) => { focused.current = true; e.currentTarget.select() }}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { focused.current = false; commit() }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className={`num w-full min-w-0 bg-transparent px-3 font-semibold outline-none placeholder:text-ink-3/50 ${compact ? 'h-11 text-[20px]' : 'h-12 text-[22px]'}`}
        />
        {suffix && <span className="pr-3 text-[15px] font-medium text-ink-3">{suffix}</span>}
      </span>
      {help && <span className="mt-1 block text-[13px] text-ink-3">{help}</span>}
    </label>
  )
}

export function TextArea({ label, value, onCommit, placeholder }: { label: string; value?: string; onCommit: (v: string) => void; placeholder?: string }) {
  const [text, setText] = useState(value ?? '')
  const focused = useRef(false)
  useEffect(() => { if (!focused.current) setText(value ?? '') }, [value])
  return (
    <label className="block">
      <span className="block text-[14px] font-medium text-ink-2">{label}</span>
      <textarea
        value={text}
        rows={3}
        placeholder={placeholder}
        onFocus={() => { focused.current = true }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { focused.current = false; if (text !== (value ?? '')) onCommit(text) }}
        className="mt-1 block w-full resize-none rounded-xl border-2 border-line bg-paper px-3 py-2.5 text-[16px] outline-none placeholder:text-ink-3/60 focus:border-ink"
      />
    </label>
  )
}

/* ------------------------------------------------------------------ Struktur */

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-paper px-4 ${className}`}>{children}</section>
}

export function Heading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-1 mt-6 flex items-end justify-between gap-3 px-1">
      <h2 className="font-cond text-[22px] font-semibold leading-none">{children}</h2>
      {aside}
    </div>
  )
}

/* ------------------------------------------------------------------ Ampel */

const LIGHT_TEXT: Record<Light, string> = { none: 'text-ink', red: 'text-bad', amber: 'text-warn', green: 'text-ok' }
const LIGHT_BG: Record<Light, string> = { none: 'bg-ink-3/40', red: 'bg-bad', amber: 'bg-volt', green: 'bg-ok' }
const LIGHT_SOFT: Record<Light, string> = { none: 'bg-chalk', red: 'bg-bad-soft', amber: 'bg-warn-soft', green: 'bg-ok-soft' }
const LIGHT_WORD: Record<Light, string> = { none: '', red: 'unter 80 %', amber: 'knapp dran', green: 'Ziel erreicht' }

export const lightText = (l: Light) => LIGHT_TEXT[l]
export const lightSoft = (l: Light) => LIGHT_SOFT[l]
export const lightWord = (l: Light) => LIGHT_WORD[l]

export function Bar({ value, target, light }: { value: number; target?: number; light: Light }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-chalk" aria-hidden>
      <div className={`h-full rounded-full ${LIGHT_BG[light]}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Dot({ light }: { light: Light }) {
  if (light === 'none') return null
  return <span aria-label={LIGHT_WORD[light]} className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${LIGHT_BG[light]}`} />
}

/* ------------------------------------------------------------------ Navigation */

export function Stepper({ title, sub, onPrev, onNext, extra }: { title: ReactNode; sub?: ReactNode; onPrev: () => void; onNext: () => void; extra?: ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Zurück" onClick={onPrev} className="grid h-11 w-11 place-items-center rounded-full active:bg-white/10">
        <ChevronLeft size={26} />
      </button>
      <div className="min-w-0 flex-1 text-center">
        <div className="truncate font-cond text-[22px] font-semibold leading-tight">{title}</div>
        {sub && <div className="truncate text-[13px] opacity-75">{sub}</div>}
      </div>
      {extra}
      <button type="button" aria-label="Weiter" onClick={onNext} className="grid h-11 w-11 place-items-center rounded-full active:bg-white/10">
        <ChevronRight size={26} />
      </button>
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex rounded-xl bg-paper p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`h-10 flex-1 rounded-lg text-[15px] font-semibold transition-colors ${o.value === value ? 'bg-ink text-white' : 'text-ink-2'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Dunkler Kopfbereich – das „Zählergehäuse“. */
export function Housing({ children }: { children: ReactNode }) {
  return <header className="pt-safe sticky top-0 z-20 bg-ink px-2 pb-2 text-white">{children}</header>
}
