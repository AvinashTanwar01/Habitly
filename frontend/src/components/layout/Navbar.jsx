import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { groupService } from '../../services/groupService'
import { statsService } from '../../services/statsService'
import Avatar from '../ui/Avatar'

const navClass = ({ isActive }) =>
  `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
    isActive
      ? 'bg-[#FAF8F5] text-[#1C1917] hover:bg-[#FAF8F5] hover:text-[#1C1917]'
      : 'text-[#EDE5DB] hover:bg-[#2a2624]'
  }`

const mobileClass = ({ isActive }) =>
  `flex flex-col items-center justify-center flex-1 min-w-0 py-2 px-0.5 text-[9px] sm:text-[10px] gap-0.5 min-h-[52px] ${
    isActive ? 'text-[#C4A882]' : 'text-[#9A8070]'
  }`

const DOTS = ['#6B9BD1', '#9B7BB8', '#C4A882', '#8C6E52']

export default function Navbar() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [streak, setStreak] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    groupService.getAll().then(setGroups).catch(() => setGroups([]))
    statsService.getSummary().then((s) => setStreak(s?.bestCurrentStreak ?? 0)).catch(() => {})
  }, [])

  return (
    <>
      <aside className="hidden md:flex w-60 min-h-screen bg-[#1C1917] text-[#FAF8F5] flex-col p-4 shrink-0">
        <header className="flex items-center gap-2 mb-6 px-1">
          <span className="w-9 h-9 bg-[#2a2624] rounded-lg flex items-center justify-center text-lg">🌱</span>
          <span className="font-semibold text-base">Habitly</span>
        </header>

        <p className="text-[10px] uppercase tracking-widest text-[#9A8070] px-2 mb-2">Personal</p>
        <nav className="space-y-1">
          <NavLink to="/dashboard" className={navClass}>
            <i className="ti ti-layout-dashboard text-base" /> Dashboard
          </NavLink>
          <NavLink to="/habits" className={navClass}>
            <i className="ti ti-checkbox text-base" /> My Habits
            {streak > 0 && (
              <span className="ml-auto text-[10px] bg-[#C4A882] text-[#1C1917] px-1.5 py-0.5 rounded-full font-semibold font-mono">
                🔥 {streak}
              </span>
            )}
          </NavLink>
          <NavLink to="/stats" className={navClass}>
            <i className="ti ti-chart-dots text-base" /> Stats
          </NavLink>
        </nav>

        <hr className="my-4 border-[#2a2624]" />
        <p className="text-[10px] uppercase tracking-widest text-[#9A8070] px-2 mb-2">Groups</p>
        <nav className="space-y-1 flex-1 overflow-y-auto min-h-0 scrollbar-none">
          {groups.map((g, i) => (
            <NavLink
              key={g._id}
              to={g.role === 'leader' ? `/groups/${g._id}/leader` : `/groups/${g._id}`}
              className={navClass}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DOTS[i % DOTS.length] }} />
              <span className="truncate flex-1">{g.name}</span>
              {g.pendingTaskCount > 0 && (
                <span className="text-[10px] bg-[#C4A882] text-[#1C1917] px-1.5 rounded-full font-semibold">
                  {g.pendingTaskCount}
                </span>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => navigate('/groups/new')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[#4a4540] text-[#9A8070] text-sm hover:border-[#C4A882] hover:text-[#EDE5DB] mt-1"
          >
            + New Group
          </button>
        </nav>

        <hr className="my-4 border-[#2a2624]" />
        <nav className="space-y-1">
          <NavLink to="/leaderboard" className={navClass}>
            <i className="ti ti-stars text-base" /> Leaderboard
          </NavLink>
          <NavLink to="/settings" className={navClass}>
            <i className="ti ti-settings text-base" /> Settings
          </NavLink>
        </nav>

        <Link
          to="/settings"
          className="mt-auto pt-4 border-t border-[#2a2624] flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#2a2624] transition-colors"
        >
          <Avatar user={user} size={30} />
          <span className="text-xs text-[#EDE5DB] truncate flex-1 min-w-0">
            {user?.displayName || user?.email || 'Account'}
          </span>
        </Link>
      </aside>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-5 bg-[#1C1917] text-[#FAF8F5] border-t border-[#2a2624]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Main navigation"
      >
        <NavLink to="/dashboard" className={mobileClass}>
          <i className="ti ti-layout-dashboard text-xl sm:text-2xl" />
          <span>Home</span>
        </NavLink>
        <NavLink to="/habits" className={mobileClass}>
          <i className="ti ti-checkbox text-xl sm:text-2xl" />
          <span>Habits</span>
        </NavLink>
        <NavLink to="/stats" className={mobileClass}>
          <i className="ti ti-chart-dots text-xl sm:text-2xl" />
          <span>Stats</span>
        </NavLink>
        <NavLink to="/groups" className={mobileClass}>
          <i className="ti ti-users text-xl sm:text-2xl" />
          <span>Groups</span>
        </NavLink>
        <NavLink to="/leaderboard" className={mobileClass}>
          <i className="ti ti-stars text-xl sm:text-2xl" />
          <span>Rank</span>
        </NavLink>
      </nav>
    </>
  )
}
