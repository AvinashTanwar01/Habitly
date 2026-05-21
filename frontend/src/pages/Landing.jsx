import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { statsService } from '../services/statsService'
import LandingSkyPreview from '../components/landing/LandingSkyPreview'
import Avatar from '../components/ui/Avatar'

const DEMO_HABITS = [
  { icon: '📖', name: 'Read', done: true },
  { icon: '🧘', name: 'Meditate', done: false },
  { icon: '🏃', name: 'Run', done: false },
]

const RITUAL_STEPS = [
  {
    n: 1,
    title: 'Plant your goals',
    body: 'Define small, achievable habits — each one a seed waiting to become a star.',
  },
  {
    n: 2,
    title: 'Nurture daily',
    body: 'Check in with a calm, focused interface. One tap lights up your sky.',
  },
  {
    n: 3,
    title: 'Watch the stars',
    body: 'Every streak adds a glow. Your habits slowly form a personal constellation.',
  },
]

function StatCell({ value, label, sub }) {
  return (
    <article className="text-center px-4 py-2">
      <p className="font-mono text-2xl md:text-3xl font-semibold text-[#1C1917] tracking-tight">{value}</p>
      <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-[#9A8070] mt-1 font-semibold">{label}</p>
      {sub ? <p className="text-[11px] text-[#C4A882] mt-1 italic font-serif">{sub}</p> : null}
    </article>
  )
}

export default function Landing() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ habitsTracked: 0, activeStreaks: 0, longestStreak: 0 })
  const [leaderboard, setLeaderboard] = useState([])

  useEffect(() => {
    statsService.getLandingStats().then(setStats).catch(() => {})
    statsService.getLeaderboard().then((rows) => setLeaderboard(Array.isArray(rows) ? rows : [])).catch(() => {})
  }, [])

  const ctaTo = user ? '/dashboard' : '/login'
  const ctaLabel = user ? 'Open dashboard' : 'Get started'

  const hasCommunity = leaderboard.length > 0
  const lbPreview = hasCommunity ? leaderboard.slice(0, 3) : []

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917]">
      {/* Nav */}
      <header className="sticky top-0 z-20 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[rgba(100,80,60,0.1)]">
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-5 md:px-8 h-16">
          <Link to="/" className="flex items-center gap-2 font-semibold text-[#1C1917] no-underline">
            <span className="w-8 h-8 rounded-lg bg-[#F2EDE6] flex items-center justify-center text-lg">🌱</span>
            Habitly
          </Link>
          <section className="hidden md:flex items-center gap-8 text-sm text-[#5a4a3a]">
            <a href="#features" className="hover:text-[#1C1917] transition-colors">Features</a>
            <a href="#ritual" className="hover:text-[#1C1917] transition-colors">The ritual</a>
            <a href="#community" className="hover:text-[#1C1917] transition-colors">Community</a>
          </section>
          <section className="flex items-center gap-4 text-sm">
            {user ? (
              <>
                <Link to="/dashboard" className="text-[#5a4a3a] hover:text-[#1C1917] hidden sm:inline">
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="text-[#8C6E52] hover:text-[#1C1917] hidden sm:inline"
                  onClick={async () => {
                    await logout()
                    navigate('/login', { replace: true })
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login" className="text-[#5a4a3a] hover:text-[#1C1917] hidden sm:inline">
                Login
              </Link>
            )}
            <Link
              to={ctaTo}
              className="inline-flex items-center justify-center bg-[#1C1917] text-[#FAF8F5] px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity no-underline"
            >
              {ctaLabel}
            </Link>
          </section>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pt-14 md:pt-20 pb-16 md:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9A8070] mb-4">
              Mindful habit tracking
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-semibold leading-[1.12] tracking-tight">
              Build habits that{' '}
              <em className="font-serif italic text-[#8C6E52] font-normal">actually</em> stick.
            </h1>
            <p className="mt-5 text-[#6b5c50] text-base md:text-lg leading-relaxed max-w-lg">
              A calm space for your daily rituals — and a constellation that grows with every
              check-in. &ldquo;One habit, one star; your sky is yours alone.&rdquo;
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                to={ctaTo}
                className="inline-flex items-center justify-center bg-[#1C1917] text-[#FAF8F5] px-7 py-3.5 rounded-full text-sm font-medium hover:opacity-90 no-underline"
              >
                Start your journey
              </Link>
              <a
                href="#ritual"
                className="inline-flex items-center justify-center bg-white text-[#1C1917] px-7 py-3.5 rounded-full text-sm font-medium border border-[rgba(100,80,60,0.25)] hover:border-[#8C6E52] no-underline transition-colors"
              >
                See the ritual
              </a>
            </div>
          </div>

          <article className="relative">
            <div
              className="absolute -inset-4 rounded-3xl opacity-40 blur-2xl pointer-events-none"
              style={{ background: 'radial-gradient(circle at 60% 40%, rgba(196,168,130,0.35), transparent 70%)' }}
            />
            <div className="relative bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl shadow-[0_20px_50px_rgba(28,25,23,0.08)] p-6 md:p-7">
              <header className="flex items-center justify-between mb-5">
                <p className="text-sm font-semibold">Daily program</p>
                <span className="text-[10px] uppercase tracking-wider text-[#9A8070]">Preview</span>
              </header>
              <ul className="space-y-3">
                {DEMO_HABITS.map((h) => (
                  <li
                    key={h.name}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      h.done ? 'bg-[#F2EDE6]' : 'bg-[#FAF8F5] border border-[rgba(100,80,60,0.08)]'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-[10px] shrink-0 ${
                        h.done ? 'bg-[#1C1917] border-[#1C1917] text-white' : 'border-[#C4A882]'
                      }`}
                    >
                      {h.done ? '✓' : ''}
                    </span>
                    <span className="text-lg">{h.icon}</span>
                    <span className={`text-sm font-medium ${h.done ? 'text-[#8C6E52]' : ''}`}>{h.name}</span>
                    {h.done && (
                      <span className="ml-auto text-[10px] text-[#C4A882] font-mono">★ lit</span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-[#9A8070] mt-4 text-center italic font-serif">
                &ldquo;Tonight, three stars — tomorrow, a constellation.&rdquo;
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* Stats — honest for early stage */}
      <section className="border-y border-[rgba(100,80,60,0.1)] bg-white/50">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[rgba(100,80,60,0.1)] py-10 px-5">
          <StatCell
            value={stats.habitsTracked > 0 ? String(stats.habitsTracked) : '1 → 1'}
            label="Habit to star"
            sub={stats.habitsTracked > 0 ? 'Tracked in our sky' : 'Every check-in counts'}
          />
          <StatCell
            value={stats.activeStreaks > 0 ? String(stats.activeStreaks) : 'Daily'}
            label={stats.activeStreaks > 0 ? 'Active streaks' : 'Gentle reminders'}
            sub="&ldquo;Small flames, steady glow.&rdquo;"
          />
          <StatCell
            value={stats.longestStreak > 0 ? `${stats.longestStreak}d` : 'Early'}
            label={stats.longestStreak > 0 ? 'Longest streak' : 'Community growing'}
            sub="Be among the first constellations"
          />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <header className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Everything you need to grow
          </h2>
          <p className="mt-3 text-[#9A8070] text-sm md:text-base">
            Tools that stay out of your way — and a sky that remembers your effort.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-4 md:gap-5">
          <article className="bg-white border border-[rgba(100,80,60,0.1)] rounded-2xl p-6 hover:shadow-md transition-shadow">
            <span className="w-10 h-10 rounded-xl bg-[#F2EDE6] flex items-center justify-center text-lg mb-4">🔔</span>
            <h3 className="font-semibold text-lg">Smart reminders</h3>
            <p className="text-sm text-[#9A8070] mt-2 leading-relaxed">
              Nudge yourself at the right moment — without the noise.
            </p>
          </article>

          <article className="bg-[#EDE5DB] border border-[rgba(100,80,60,0.08)] rounded-2xl p-6">
            <span className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center text-lg mb-4">🏆</span>
            <h3 className="font-semibold text-lg">Constellation leaderboard</h3>
            <p className="text-sm text-[#6b5c50] mt-2 leading-relaxed">
              See how others shine — each person mapped among the stars, not just a number.
            </p>
          </article>

          <article className="md:col-span-2 bg-[#1C1917] text-[#FAF8F5] rounded-2xl overflow-hidden border border-[#2a2624]">
            <div className="grid md:grid-cols-2">
              <div className="p-6 md:p-8 flex flex-col justify-center order-2 md:order-1">
                <h3 className="text-xl md:text-2xl font-semibold">Your habit constellation</h3>
                <p className="text-sm text-[#C4A882]/90 mt-3 leading-relaxed">
                  Every habit you keep becomes a star in your personal night sky. Lines connect the
                  days you showed up — watch your progress{' '}
                  <em className="font-serif italic text-[#EDE5DB]">shine</em>.
                </p>
                <blockquote className="mt-4 pl-3 border-l-2 border-[#C4A882]/50 text-sm text-[#9A8070] italic font-serif">
                  &ldquo;The sky does not rush the stars — neither should you.&rdquo;
                </blockquote>
              </div>
              <div className="p-4 md:p-5 order-1 md:order-2 min-h-[180px]">
                <LandingSkyPreview height={200} subtitle="Yours to fill" />
              </div>
            </div>
          </article>

          <article className="bg-[#E8C4B8] rounded-2xl p-6 border border-[rgba(100,80,60,0.08)]">
            <h3 className="font-semibold text-lg">Groups & rituals</h3>
            <p className="text-sm text-[#5a4a3a] mt-2">
              Share streaks with family or friends — separate constellations, same sky.
            </p>
            <div className="flex -space-x-2 mt-4">
              {['#C4A882', '#8C6E52', '#A67C5B', '#7A9E7E'].map((c, i) => (
                <span
                  key={i}
                  className="w-9 h-9 rounded-full border-2 border-[#FAF8F5] flex items-center justify-center text-xs font-semibold text-white"
                  style={{ background: c }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
              ))}
            </div>
          </article>

          <article className="bg-white border border-[rgba(100,80,60,0.1)] rounded-2xl p-6">
            <h3 className="font-semibold text-lg">Three habit types</h3>
            <p className="text-sm text-[#9A8070] mt-2">
              Time, count, or simple yes/no — log what matters, see it in your sky.
            </p>
          </article>
        </div>
      </section>

      {/* Ritual */}
      <section id="ritual" className="bg-white border-y border-[rgba(100,80,60,0.1)] py-20 md:py-24">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <header className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-[#C4A882] mb-2">The Habitly ritual</p>
            <h2 className="text-3xl md:text-4xl font-semibold">From seed to constellation</h2>
          </header>
          <ol className="grid md:grid-cols-3 gap-10 md:gap-8">
            {RITUAL_STEPS.map((step) => (
              <li key={step.n} className="text-center md:text-left">
                <span className="inline-flex w-12 h-12 rounded-full bg-[#1C1917] text-[#FAF8F5] items-center justify-center font-mono text-lg font-semibold mb-5">
                  {step.n}
                </span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-[#9A8070] mt-2 leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Community */}
      <section id="community" className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-semibold leading-tight">
              Your streak earns you a star in the sky.
            </h2>
            <p className="mt-4 text-[#9A8070] leading-relaxed">
              We&apos;re building a small, sincere community — no inflated numbers, just real
              people lighting up their constellations.
            </p>
            <blockquote className="mt-6 p-4 bg-[#F2EDE6] rounded-xl border border-[rgba(100,80,60,0.1)]">
              <p className="text-sm italic font-serif text-[#5a4a3a]">
                &ldquo;{hasCommunity && lbPreview[0]
                  ? `${lbPreview[0].displayName} is on a ${lbPreview[0].streak}-day streak — another star in the Habit Sky.`
                  : 'Be the first to place a star — the sky is wide open.'}&rdquo;
              </p>
            </blockquote>
          </div>

          <article className="bg-white border border-[rgba(100,80,60,0.12)] rounded-2xl p-6 shadow-sm">
            <header className="flex items-center justify-between mb-5">
              <h3 className="font-semibold">Weekly leaderboard</h3>
              <Link to="/leaderboard" className="text-xs text-[#8C6E52] hover:underline">
                View all →
              </Link>
            </header>
            {hasCommunity ? (
              <ul className="space-y-3">
                {lbPreview.map((r, i) => (
                  <li
                    key={r.id || r.userId || i}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      i === 1 ? 'bg-[#F2EDE6] ring-1 ring-[#C4A882]/30' : 'bg-[#FAF8F5]'
                    }`}
                  >
                    <span className="font-mono text-sm text-[#C4A882] w-6">#{i + 1}</span>
                    <Avatar
                      user={{ displayName: r.displayName, profileImage: r.profileImage }}
                      size={36}
                    />
                    <span className="flex-1 text-sm font-medium truncate">{r.displayName}</span>
                    <span className="font-mono text-xs text-[#8C6E52]">{r.streak}d ★</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-10 px-4">
                <p className="text-4xl mb-2 opacity-40">✦</p>
                <p className="text-sm text-[#9A8070]">No public streaks yet.</p>
                <p className="text-xs text-[#C4A882] mt-2 italic font-serif">
                  Start yours — the constellation map is waiting.
                </p>
                <Link
                  to="/login"
                  className="inline-block mt-4 text-sm text-[#8C6E52] font-medium hover:underline"
                >
                  Create your account →
                </Link>
              </div>
            )}
          </article>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold">Start your streak today.</h2>
        <p className="mt-4 text-[#9A8070] italic font-serif text-lg max-w-md mx-auto">
          &ldquo;The best time to plant a tree was twenty years ago. The second best time is
          now — and tonight, one more star.&rdquo;
        </p>
        <Link
          to={ctaTo}
          className="inline-flex items-center gap-2 mt-8 bg-[#1C1917] text-[#FAF8F5] px-8 py-4 rounded-full text-base font-medium hover:opacity-90 no-underline transition-opacity"
        >
          Get started for free
          <span aria-hidden>→</span>
        </Link>
        <p className="text-xs text-[#9A8070] mt-5">Free on web · Works in your browser today</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(100,80,60,0.12)] bg-white/60">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 font-semibold no-underline text-[#1C1917]">
              <span className="w-8 h-8 rounded-lg bg-[#F2EDE6] flex items-center justify-center">🌱</span>
              Habitly
            </Link>
            <p className="text-sm text-[#9A8070] mt-3 max-w-xs leading-relaxed">
              Mindful habit tracking with a constellation for every day you show up.
            </p>
            <p className="text-xs text-[#C4A882] mt-3 italic font-serif">
              &ldquo;Progress you can see — written in stars.&rdquo;
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[#9A8070] font-semibold mb-3">Product</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="text-[#5a4a3a] hover:text-[#1C1917] no-underline">Features</a></li>
              <li><a href="#ritual" className="text-[#5a4a3a] hover:text-[#1C1917] no-underline">The ritual</a></li>
              <li><Link to="/leaderboard" className="text-[#5a4a3a] hover:text-[#1C1917] no-underline">Leaderboard</Link></li>
              <li><Link to={ctaTo} className="text-[#5a4a3a] hover:text-[#1C1917] no-underline">Get started</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[#9A8070] font-semibold mb-3">Support</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login" className="text-[#5a4a3a] hover:text-[#1C1917] no-underline">Sign in</Link></li>
              <li><a href="#community" className="text-[#5a4a3a] hover:text-[#1C1917] no-underline">Community</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-5 md:px-8 pb-8 flex flex-col sm:flex-row justify-between gap-2 text-xs text-[#9A8070] border-t border-[rgba(100,80,60,0.08)] pt-6">
          <span>© {new Date().getFullYear()} Habitly. All rights reserved.</span>
          {stats.habitsTracked > 0 && (
            <span className="font-mono">
              {stats.habitsTracked} habits · {stats.activeStreaks} active streaks in our sky
            </span>
          )}
        </div>
      </footer>
    </div>
  )
}
