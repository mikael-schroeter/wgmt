// Datumslogik: ISO-Kalenderwochen (Mo–So), wie in der Tabelle (KW 1/2026 beginnt am 29.12.2025).

export type DateKey = string // 'YYYY-MM-DD'
export type WeekKey = string // 'YYYY-Www'

const pad = (n: number) => String(n).padStart(2, '0')

export const toKey = (d: Date): DateKey => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fromKey = (k: DateKey): Date => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export const todayKey = () => toKey(new Date())

export const addDays = (k: DateKey, n: number): DateKey => {
  const d = fromKey(k)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

/** Montag der Woche, in der `k` liegt. */
export const mondayOf = (k: DateKey): DateKey => {
  const d = fromKey(k)
  const dow = (d.getDay() + 6) % 7 // Mo=0
  return addDays(k, -dow)
}

export const weekDays = (k: DateKey): DateKey[] => {
  const mo = mondayOf(k)
  return Array.from({ length: 7 }, (_, i) => addDays(mo, i))
}

/** ISO-Woche: Jahr + Nummer. */
export const isoWeek = (k: DateKey): { year: number; week: number } => {
  const thu = fromKey(addDays(mondayOf(k), 3))
  const year = thu.getFullYear()
  const jan4 = toKey(new Date(year, 0, 4, 12))
  const w1 = fromKey(mondayOf(jan4))
  const week = Math.round((thu.getTime() - w1.getTime()) / (7 * 864e5) - 3 / 7) + 1
  return { year, week }
}

export const weekKey = (k: DateKey): WeekKey => {
  const { year, week } = isoWeek(k)
  return `${year}-W${pad(week)}`
}

/** Montag einer ISO-Woche. */
export const mondayOfWeek = (wk: WeekKey): DateKey => {
  const [y, w] = wk.split('-W').map(Number)
  const w1 = mondayOf(toKey(new Date(y, 0, 4, 12)))
  return addDays(w1, (w - 1) * 7)
}

/** Alle ISO-Wochen eines Jahres (52 oder 53). */
export const weeksOfYear = (year: number): WeekKey[] => {
  const out: WeekKey[] = []
  let mo = mondayOf(toKey(new Date(year, 0, 4, 12)))
  while (isoWeek(mo).year === year) {
    out.push(weekKey(mo))
    mo = addDays(mo, 7)
  }
  return out
}

const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const WD_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const MON_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

export const fmtWeekday = (k: DateKey) => WD[fromKey(k).getDay()]
export const fmtWeekdayLong = (k: DateKey) => WD_LONG[fromKey(k).getDay()]
export const fmtDayMonth = (k: DateKey) => {
  const d = fromKey(k)
  return `${d.getDate()}. ${MON_SHORT[d.getMonth()]}`
}
export const fmtLong = (k: DateKey) => {
  const d = fromKey(k)
  return `${WD_LONG[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
export const fmtWeekRange = (wk: WeekKey) => {
  const mo = mondayOfWeek(wk)
  return `${fmtDayMonth(mo)} – ${fmtDayMonth(addDays(mo, 6))}`
}
export const weekNo = (wk: WeekKey) => Number(wk.split('-W')[1])
