import { useEffect } from 'react'
import { CalendarDays, DoorOpen, Gauge, Trophy, Users, type LucideIcon } from 'lucide-react'
import { TABS, useStore, type Tab } from './store'
import { startSync } from './sync'
import { Today } from './screens/Today'
import { Week } from './screens/Week'
import { Stats } from './screens/Stats'
import { Team } from './screens/Team'
import { Goals } from './screens/Goals'

const NAV: { tab: Tab; label: string; icon: LucideIcon }[] = [
  { tab: 'heute', label: 'Heute', icon: DoorOpen },
  { tab: 'woche', label: 'Woche', icon: CalendarDays },
  { tab: 'quoten', label: 'Quoten', icon: Gauge },
  { tab: 'team', label: 'Team', icon: Users },
  { tab: 'ziele', label: 'Ziele', icon: Trophy },
]

export default function App() {
  const tab = useStore((s) => s.tab)
  const setTab = useStore((s) => s.setTab)

  useEffect(() => { startSync() }, [])
  useEffect(() => {
    const onHash = () => {
      const h = location.hash.slice(1) as Tab
      if (TABS.includes(h)) useStore.setState({ tab: h })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [tab])

  return (
    <div className="min-h-dvh">
      {tab === 'heute' && <Today />}
      {tab === 'woche' && <Week />}
      {tab === 'quoten' && <Stats />}
      {tab === 'team' && <Team />}
      {tab === 'ziele' && <Goals />}

      <nav aria-label="Bereiche" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur">
        <ul className="mx-auto flex max-w-xl">
          {NAV.map(({ tab: t, label, icon: Icon }) => {
            const active = t === tab
            return (
              <li key={t} className="flex-1">
                <button
                  type="button"
                  onClick={() => setTab(t)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-16 w-full flex-col items-center justify-center gap-0.5 text-[12px] font-semibold ${active ? 'text-ink' : 'text-ink-3'}`}
                >
                  <span className={`grid h-8 w-14 place-items-center rounded-full ${active ? 'bg-volt' : ''}`}>
                    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                  </span>
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
