import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import {
  initBgStars,
  drawSkyBackground,
  drawBgStars,
  drawAnimatedLinesFromStars,
  drawDataStar,
  drawCenteredMessage,
  drawTooltip,
  findClosestStar,
  scaleStars,
  tickTwinkle,
  constellationFromCategory,
} from '../../utils/constellationCanvas'

function makeRng(seed) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return (h >>> 0) / 4294967296
  }
}

function buildLeaderboardStars(users, W, H) {
  if (!users.length) return { stars: [], lines: [] }

  // Sort by streak descending so rank 0 = highest
  const sorted = [...users].sort((a, b) => (b.streak || 0) - (a.streak || 0))
  const maxStreak = sorted[0]?.streak || 1

  const stars = sorted.map((u, i) => {
    const streak = u.streak || 0
    const rnd = makeRng(`${u.userId || u.id || i}-${streak}`)

    // Vertical: top 20% for highest, bottom 40% for zero streak
    const ratio = maxStreak > 0 ? streak / maxStreak : 0
    const yMin = H * 0.05
    const yMax = H * 0.88
    // High streak → small y (top), low streak → large y (bottom)
    const yCenter = yMax - ratio * (yMax - yMin * 2.5)
    // Add some random scatter around the y band
    const yScatter = H * 0.08
    const y = Math.max(yMin, Math.min(yMax, yCenter + (rnd() - 0.5) * yScatter))

    // Spread x across full width
    const x = W * (0.06 + rnd() * 0.88)

    // Size & glow based on streak
    let r, glow, alpha, colorBase
    if (streak >= 60) {
      r = 6.5; glow = 22; alpha = 0.95; colorBase = '255,250,220'
    } else if (streak >= 30) {
      r = 5; glow = 18; alpha = 0.88; colorBase = '255,235,160'
    } else if (streak >= 14) {
      r = 3.8; glow = 14; alpha = 0.78; colorBase = '255,215,120'
    } else if (streak >= 7) {
      r = 2.8; glow = 10; alpha = 0.65; colorBase = '220,185,110'
    } else if (streak >= 1) {
      r = 1.8; glow = 6;  alpha = 0.45; colorBase = '180,155,100'
    } else {
      r = 1.2; glow = 3;  alpha = 0.25; colorBase = '140,120,90'
    }

    // Movement: faster for higher streaks
    const speed = 0.015 + (ratio * 0.06)
    const angle = rnd() * Math.PI * 2

    return {
      userId: String(u.userId || u.id || ''),
      displayName: u.displayName || 'User',
      streak,
      habitCategory: u.habitCategory,
      constellation: constellationFromCategory(u.habitCategory),
      x, y, r, glow, alpha,
      colorBase,
      fill: `rgba(${colorBase},${alpha})`,
      glowColor: `rgba(${colorBase},0.6)`,
      minAlpha: Math.max(0.15, alpha - 0.2),
      maxAlpha: Math.min(1, alpha + 0.08),
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed * 0.3, // less vertical movement to preserve rank
      twinkleSpeed: 0.006 + rnd() * 0.012,
      twinkleDir: rnd() > 0.5 ? 1 : -1,
      label: (u.displayName || '').slice(0, 12),
      tooltipLines: [
        u.displayName || 'User',
        `${streak} day streak`,
        constellationFromCategory(u.habitCategory),
      ],
      // Store y bounds for bouncing
      yMin: Math.max(H * 0.03, y - yScatter),
      yMax: Math.min(H * 0.95, y + yScatter),
    }
  })

  // Connect nearby stars (max 2 neighbors per star)
  const lines = []
  const maxDist = W * 0.15
  const neighborCount = new Map(stars.map(s => [s.userId, 0]))

  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      if ((neighborCount.get(stars[i].userId) || 0) >= 2) break
      if ((neighborCount.get(stars[j].userId) || 0) >= 2) continue
      const dist = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y)
      if (dist < maxDist) {
        lines.push([stars[i], stars[j]])
        neighborCount.set(stars[i].userId, (neighborCount.get(stars[i].userId) || 0) + 1)
        neighborCount.set(stars[j].userId, (neighborCount.get(stars[j].userId) || 0) + 1)
      }
    }
  }

  return { stars, lines }
}

const LeaderboardConstellation = forwardRef(function LeaderboardConstellation(
  { users = [], loading = false, highlightUserId = null },
  ref
) {
  const canvasRef = useRef(null)
  const bgRef = useRef([])
  const dataRef = useRef([])
  const linesRef = useRef([])
  const hoveredRef = useRef(null)
  const highlightRef = useRef(null)
  const highlightUntilRef = useRef(0)
  const sizeRef = useRef({ w: 0, h: 0 })

  useImperativeHandle(ref, () => ({
    highlightUser(userId) {
      highlightRef.current = userId ? String(userId) : null
      highlightUntilRef.current = Date.now() + 2000
    },
  }))

  useEffect(() => {
    highlightRef.current = highlightUserId ? String(highlightUserId) : null
    if (highlightUserId) highlightUntilRef.current = Date.now() + 2000
  }, [highlightUserId])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId = 0
    sizeRef.current = { w: 0, h: 0 }

    const resize = () => {
      const oldW = sizeRef.current.w
      const oldH = sizeRef.current.h
      const w = canvas.clientWidth || 500
      const h = Math.max(500, canvas.clientHeight || 500)
      canvas.width = w
      canvas.height = h
      bgRef.current = initBgStars(w, h)

      if (oldW && oldH && dataRef.current.length) {
        scaleStars(dataRef.current, oldW, oldH, w, h)
      } else {
        const built = buildLeaderboardStars(users, w, h)
        dataRef.current = built.stars
        linesRef.current = built.lines
      }
      sizeRef.current = { w, h }
    }

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / rect.width) * canvas.width
      const my = ((e.clientY - rect.top) / rect.height) * canvas.height
      hoveredRef.current = findClosestStar(dataRef.current, mx, my, 30)
    }
    const handleMouseLeave = () => { hoveredRef.current = null }

    const draw = () => {
      const W = canvas.width
      const H = canvas.height
      drawSkyBackground(ctx, W, H)
      drawBgStars(ctx, bgRef.current, W, H)

      if (loading) {
        drawCenteredMessage(ctx, W, H, 'Loading the habit sky…')
        animId = requestAnimationFrame(draw)
        return
      }

      if (!users.length) {
        drawCenteredMessage(ctx, W, H, 'No stars yet.\nBe the first to build a streak.')
        animId = requestAnimationFrame(draw)
        return
      }

      if (linesRef.current.length) {
        drawAnimatedLinesFromStars(ctx, linesRef.current)
      }

      const hovered = hoveredRef.current
      const now = Date.now()
      const rowHighlight =
        highlightRef.current && now < highlightUntilRef.current ? highlightRef.current : null

      dataRef.current.forEach((s) => {
        // Move horizontally, wrap around edges
        s.x += s.dx
        if (s.x < 0) s.x = W
        if (s.x > W) s.x = 0

        // Bounce vertically within streak band
        s.y += s.dy
        if (s.y < s.yMin) { s.y = s.yMin; s.dy = Math.abs(s.dy) }
        if (s.y > s.yMax) { s.y = s.yMax; s.dy = -Math.abs(s.dy) }

        tickTwinkle(s)

        // Update fill with current alpha
        s.fill = `rgba(${s.colorBase},${s.alpha})`

        const isHov = hovered === s
        const isRow = rowHighlight && s.userId === rowHighlight
        drawDataStar(ctx, s, isHov || isRow)

        if (isRow && !isHov) {
          ctx.save()
          ctx.shadowBlur = (s.glow || 12) + 10
          ctx.shadowColor = 'rgba(255,200,80,0.7)'
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r + 4, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,220,120,${s.alpha})`
          ctx.fill()
          ctx.restore()
        }
      })

      ctx.fillStyle = 'rgba(154,128,112,0.55)'
      ctx.font = 'italic 11px "DM Sans", Georgia, serif'
      ctx.textAlign = 'left'
      ctx.fillText('The Habit Sky — Each star represents a real user journey.', 20, H - 20)

      if (hovered?.tooltipLines) {
        drawTooltip(ctx, hovered, hovered.tooltipLines, W)
      }

      animId = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)
    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [users, loading])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full min-h-[500px] rounded-xl cursor-crosshair block"
      style={{ background: '#0A0908' }}
    />
  )
})

export default LeaderboardConstellation