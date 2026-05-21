import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GoogleSignInButton from '../components/auth/GoogleSignInButton'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { statsService } from '../services/statsService'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function Login() {
  const [tab, setTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ activeStreaks: 0, habitsTracked: 0, longestStreak: 0 })
  const { login, signup, googleLogin, user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const redirectTo = (() => {
    const q = new URLSearchParams(window.location.search).get('redirect')
    return q && q.startsWith('/') ? q : '/dashboard'
  })()
  const goAfterAuth = () => navigate(redirectTo, { replace: true })
  const canvasRef = useRef(null)

  const [form, setForm] = useState({ displayName: '', email: '', password: '' })

  useEffect(() => {
    if (!authLoading && user) goAfterAuth()
  }, [user, authLoading, navigate])

  useEffect(() => {
    statsService.getLandingStats().then(setStats).catch(() => {})
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let stars = []

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      stars = Array.from({ length: 120 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.6 + 0.2,
        dx: (Math.random() - 0.5) * 0.15,
        dy: (Math.random() - 0.5) * 0.15,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleDir: 1,
      }))
    }
    resize()
    window.addEventListener('resize', resize)

    const connections = []
    for (let i = 0; i < 18; i++) {
      const a = Math.floor(Math.random() * 120)
      const b = Math.floor(Math.random() * 120)
      connections.push([a, b])
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#0E0C0A'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      connections.forEach(([a, b]) => {
        const sa = stars[a]
        const sb = stars[b]
        const dist = Math.hypot(sa.x - sb.x, sa.y - sb.y)
        if (dist < 200) {
          ctx.beginPath()
          ctx.moveTo(sa.x, sa.y)
          ctx.lineTo(sb.x, sb.y)
          ctx.strokeStyle = `rgba(196,168,130,${0.12 - dist / 2000})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      })

      stars.forEach((s) => {
        s.alpha += s.twinkleSpeed * s.twinkleDir
        if (s.alpha >= 0.9 || s.alpha <= 0.1) s.twinkleDir *= -1
        s.x += s.dx
        s.y += s.dy
        if (s.x < 0) s.x = canvas.width
        if (s.x > canvas.width) s.x = 0
        if (s.y < 0) s.y = canvas.height
        if (s.y > canvas.height) s.y = 0

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,245,220,${s.alpha})`
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // Google auth handled by <GoogleLogin />

  const handle = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') {
        await login({ email: form.email, password: form.password })
        toast.success('Welcome back! Signed in successfully.')
      } else {
        if (!form.displayName.trim()) throw new Error('Display name is required')
        await signup(form)
        toast.success('Account created — welcome to Habitly!')
      }
      goAfterAuth()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-screen relative flex items-center justify-center p-4">
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
      <section className="w-full max-w-4xl grid md:grid-cols-2 rounded-2xl overflow-hidden shadow-xl relative z-10">
        <aside className="bg-[#1C1917] text-[#FAF8F5] p-8 flex flex-col justify-between">
          <header>
            <p className="text-lg font-semibold mb-6">🌱 Habitly</p>
            <h1 className="text-2xl font-semibold leading-snug">
              Build habits that <span className="text-[#C4A882]">actually stick.</span>
            </h1>
            <p className="text-sm text-[#9A8070] mt-3">Track daily. Grow your streak. Join the public leaderboard.</p>
          </header>
          <ul className="space-y-3 text-sm my-8">
            <li><span className="font-mono text-[#C4A882]">{stats.activeStreaks}+</span> Active streaks</li>
            <li><span className="font-mono text-[#C4A882]">{stats.habitsTracked}+</span> Habits tracked</li>
            <li><span className="font-mono text-[#C4A882]">{stats.longestStreak}</span> Longest streak (days)</li>
          </ul>
          <p className="text-xs text-[#9A8070]">Leaderboard streaks are public.</p>
        </aside>

        <section className="bg-[#F2EDE6] p-8">
          <nav className="flex gap-2 mb-6">
            {['login', 'signup'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  tab === t ? 'bg-[#1C1917] text-white' : 'bg-[#EDE5DB] text-[#8C6E52]'
                }`}
              >
                {t === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </nav>

          {error && <p className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</p>}

          <form onSubmit={submit} className="space-y-4">
            {tab === 'signup' && (
              <Input label="Display name" name="displayName" value={form.displayName} onChange={handle} required />
            )}
            <Input label="Email" name="email" type="email" value={form.email} onChange={handle} required />
            <Input label="Password" name="password" type="password" value={form.password} onChange={handle} required />
            {tab === 'login' && (
              <p className="text-xs text-[#9A8070]">
                <Link to="/forgot-password" className="underline">Forgot password?</Link>
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : tab === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          {googleClientId && (
            <>
              <p className="text-center text-xs text-[#9A8070] my-4">OR</p>
              <GoogleSignInButton
                disabled={loading}
                context={tab === 'signup' ? 'signup' : 'signin'}
                text={tab === 'signup' ? 'signup_with' : 'continue_with'}
                onSuccess={async (credentialResponse) => {
                  if (!credentialResponse?.credential) {
                    setError('Google did not return a credential. Try again or use email/password.')
                    return
                  }
                  try {
                    setLoading(true)
                    setError('')
                    await googleLogin(credentialResponse.credential)
                    toast.success('Signed in with Google')
                    goAfterAuth()
                  } catch (err) {
                    setError(err.response?.data?.message || err.message || 'Google sign in failed')
                  } finally {
                    setLoading(false)
                  }
                }}
                onError={(err) => setError(err.message || 'Google sign in failed')}
              />
            </>
          )}

          <p className="text-center text-sm text-[#8C6E52] mt-6">
            {tab === 'login' ? (
              <>No account? <button type="button" className="underline" onClick={() => setTab('signup')}>Create one</button></>
            ) : (
              <>Have an account? <button type="button" className="underline" onClick={() => setTab('login')}>Sign in</button></>
            )}
          </p>
        </section>
      </section>
    </section>
  )
}
