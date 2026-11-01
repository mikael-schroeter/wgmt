const eur0 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const eur2 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })

export const fmtEur = (v: number, cents = false) => (cents ? eur2 : eur0).format(v)
export const fmtNum = (v: number) => num.format(v)
export const fmtPct = (v: number | null, digits = 0) =>
  v == null ? '–' : `${(v * 100).toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits })} %`
export const fmtRatio = (v: number | null, digits = 1) =>
  v == null ? '–' : v.toLocaleString('de-DE', { maximumFractionDigits: digits })

/** Deutsche Eingaben: „1.234,50“ / „12,5“ / „12.5“ → Zahl. Leer → undefined. */
export const parseNum = (s: string): number | undefined => {
  const t = s.trim().replace(/\s|€|%/g, '')
  if (!t) return undefined
  const norm = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  const v = Number(norm)
  return isFinite(v) ? v : undefined
}

export const toInput = (v?: number | null) => (v == null ? '' : String(v).replace('.', ','))
