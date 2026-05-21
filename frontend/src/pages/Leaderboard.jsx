import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { statsService } from '../services/statsService'
import LeaderboardConstellation from '../components/charts/LeaderboardConstellation'
import Avatar from '../components/ui/Avatar'

const FILTERS = ['All', 'Study', 'Fitness', 'Wellness']

export default function Leaderboard() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('All')
  const [hoverKey, setHoverKey] = useState(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    statsService
      .getLeaderboard()
      .then((r) => {
        if (!cancelled) setRows(Array.isArray(r) ? r : [])
      })
      .catch((err) => {
        if (!cancelled) {
          setRows([])
          setError(err.response?.data?.message || err.message || 'Could not load leaderboard')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const filtered = filter === 'All' ? rows : rows.filter((r) => r.habitCategory === filter)

  const listRows = useMemo(
    () => [...filtered].sort((a, b) => (b.streak || 0) - (a.streak || 0)),
    [filtered],
  )

  return (
    <section className="min-h-screen bg-[#FAF8F5]">
      <nav className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-[rgba(100,80,60,0.12)] bg-[#FAF8F5]">
        <Link to="/" className="font-semibold text-[#1C1917] text-sm sm:text-base shrink-0">
          🌱 Habitly
        </Link>
        <section className="hidden sm:flex gap-4 md:gap-6 text-sm text-[#8C6E52]">
          <Link to="/leaderboard" className="text-[#1C1917] font-medium">
            Leaderboard
          </Link>
          <a href="/#features" className="hover:text-[#1C1917]">Features</a>
        </section>
        {user ? (
          <Link
            to="/dashboard"
            className="text-xs sm:text-sm font-medium bg-[#1C1917] text-[#FAF8F5] px-3 sm:px-4 py-2 rounded-lg shrink-0 min-h-[40px] flex items-center"
          >
            Dashboard
          </Link>
        ) : (
          <Link
            to="/login"
            className="text-xs sm:text-sm font-medium bg-[#1C1917] text-[#FAF8F5] px-3 sm:px-4 py-2 rounded-lg shrink-0 min-h-[40px] flex items-center"
          >
            Get Started
          </Link>
        )}
      </nav>

      <section className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-0 max-w-[1400px] mx-auto min-h-0 lg:min-h-[calc(100dvh-72px)]">
        <section className="relative min-h-[280px] sm:min-h-[360px] lg:min-h-[calc(100dvh-72px)] p-3 sm:p-4 lg:p-6 order-1">
          <LeaderboardConstellation
            ref={canvasRef}
            users={listRows}
            loading={loading}
            highlightUserId={hoverKey}
          />
        </section>

        <section className="bg-[#1C1917] text-[#FAF8F5] p-4 sm:p-6 lg:p-8 flex flex-col border-t lg:border-t-0 lg:border-l border-[#2a2624] order-2 min-h-0 max-h-[55vh] lg:max-h-none">
          <header className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">Global Leaderboard</h1>
            <p className="text-sm text-[#9A8070] mt-2">Ranked by current streak across all dimensions.</p>
          </header>

          <nav className="flex gap-2 mb-6 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide ${
                  filter === f
                    ? 'bg-[#C4A882] text-[#1C1917]'
                    : 'border border-[#4a4540] text-[#9A8070] hover:border-[#C4A882]'
                }`}
              >
                {f === 'All' ? 'All Habits' : f}
              </button>
            ))}
          </nav>

          {error && (
            <p className="mb-4 p-3 bg-red-950/40 border border-red-800 text-red-300 text-sm rounded-xl">{error}</p>
          )}

          <ul className="space-y-0 flex-1 overflow-y-auto -mx-2">
            {loading ? (
              <li className="text-sm text-[#9A8070] py-8 px-2">Loading rankings…</li>
            ) : listRows.length === 0 ? (
              <li className="text-sm text-[#9A8070] py-8 px-2">
                {error ? 'Leaderboard unavailable.' : 'No entries yet. Create a habit and build a streak!'}
              </li>
            ) : (
              listRows.map((r, i) => {
                const uid = String(r.userId || r.id || i)
                const medal =
                  i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-[#9A8070]'
                const group =
                  r.habitCategory === 'Study'
                    ? 'THE SCHOLARS'
                    : r.habitCategory === 'Fitness'
                      ? 'THE ATHLETES'
                      : r.habitCategory === 'Wellness'
                        ? 'THE SEEKERS'
                        : 'THE WANDERERS'
                return (
                  <li
                    key={uid}
                    onMouseEnter={() => {
                      setHoverKey(uid)
                      canvasRef.current?.highlightUser(uid)
                    }}
                    onMouseLeave={() => setHoverKey(null)}
                    className={`flex items-center gap-2 sm:gap-4 py-3 sm:py-4 px-2 border-b border-[#2a2624] transition-colors ${
                      hoverKey === uid ? 'bg-[#2a2624]/80' : ''
                    }`}
                  >
                    <span className={`w-6 sm:w-8 font-mono text-xs sm:text-sm font-semibold shrink-0 ${medal}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      className="shrink-0"
                    >
                      <Avatar
                        user={{ displayName: r.displayName, profileImage: r.profileImage }}
                        size={36}
                      />
                    </span>
                    <section className="flex-1 min-w-0">
                      <p className="font-medium truncate">{r.displayName}</p>
                      <p className="text-[10px] text-[#9A8070] tracking-widest mt-0.5">{group}</p>
                    </section>
                    <span className="font-mono text-sm text-[#C4A882] shrink-0">{r.streak} DAYS</span>
                  </li>
                )
              })
            )}
          </ul>

          <p className="text-[9px] text-[#6a5a4a] tracking-widest mt-6 uppercase leading-relaxed">
            Your display name and streak appear here publicly. Privacy settings.
          </p>
        </section>
      </section>
    </section>
  )
}
