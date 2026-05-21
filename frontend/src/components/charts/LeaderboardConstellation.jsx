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
  wrapStar,
  tickTwinkle,
  constellationFromCategory,
  CONSTELLATION_ZONES,
  streakRadius,
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

function buildLeaderboardStars(users, W, H, allLowStreak) {
  if (!users.length) return { stars: [], lines: [], groupLabels: [] }

  if (users.length <= 2) {
    const stars = users.map((u, i) => {
      const { r, glow } = streakRadius(u.streak || 0)
      const x = W * (0.42 + i * 0.12)
      const y = H * 0.5
      return makeStar(u, x, y, r, glow, 0.9)
    })
    return { stars, lines: [], groupLabels: [] }
  }

  const groups = {}
  users.forEach((u) => {
    const name = allLowStreak ? 'Rising Stars' : constellationFromCategory(u.habitCategory)
    if (!groups[name]) groups[name] = []
    groups[name].push(u)
  })

  const stars = []
  const lines = []
  const groupLabels = []

  Object.entries(groups).forEach(([groupName, members]) => {
    const zone = CONSTELLATION_ZONES[groupName] || CONSTELLATION_ZONES['The Wanderers']
    const rnd = makeRng(`${groupName}-${members.length}`)
    const gx0 = zone.x0 * W
    const gx1 = zone.x1 * W
    const gy0 = zone.y0 * H
    const gy1 = zone.y1 * H
    const clusterStars = []

    members.forEach((u, i) => {
      const { r, glow } = streakRadius(u.streak || 0)
      const x = gx0 + rnd() * (gx1 - gx0)
      const y = gy0 + rnd() * (gy1 - gy0)
      const star = makeStar(u, x, y, r, glow, u.streak >= 14 ? 0.88 : 0.55)
      clusterStars.push(star)
      stars.push(star)
    })

    const maxDist = W * 0.18
    for (let i = 0; i < clusterStars.length; i++) {
      for (let j = i + 1; j < clusterStars.length; j++) {
        const a = clusterStars[i]
        const b = clusterStars[j]
        if (Math.hypot(a.x - b.x, a.y - b.y) < maxDist) {
          lines.push([a, b])
        }
      }
    }

    groupLabels.push({
      text: groupName.toUpperCase(),
      x: (gx0 + gx1) / 2,
      y: gy0 + 14,
    })
  })

  return { stars, lines, groupLabels }
}

function makeStar(u, x, y, r, glow, alphaBase) {
  const id = String(u.userId || u.id || '')
  return {
    userId: id,
    displayName: u.displayName || 'User',
    streak: u.streak || 0,
    habitCategory: u.habitCategory,
    constellation: constellationFromCategory(u.habitCategory),
    x,
    y,
    r,
    glow,
    alpha: alphaBase,
    minAlpha: 0.65,
    maxAlpha: 0.95,
    dx: (Math.random() - 0.5) * 0.05,
    dy: (Math.random() - 0.5) * 0.05,
    twinkleSpeed: Math.random() * 0.01 + 0.008,
    twinkleDir: Math.random() > 0.5 ? 1 : -1,
    label: (u.displayName || '').slice(0, 10),
    tooltipLines: [
      u.displayName || 'User',
      `${u.streak || 0} day streak`,
      constellationFromCategory(u.habitCategory),
    ],
  }
}

const LeaderboardConstellation = forwardRef(function LeaderboardConstellation(
  { users = [], loading = false, highlightUserId = null },
  ref
) {
  const canvasRef = useRef(null)
  const bgRef = useRef([])
  const dataRef = useRef([])
  const linesRef = useRef([])
  const labelsRef = useRef([])
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

      const allLow = users.length > 0 && users.every((u) => (u.streak || 0) < 14)
      if (oldW && oldH && dataRef.current.length) {
        scaleStars(dataRef.current, oldW, oldH, w, h)
        labelsRef.current.forEach((lb) => {
          lb.x *= w / oldW
          lb.y *= h / oldH
        })
      } else {
        const built = buildLeaderboardStars(users, w, h, allLow)
        dataRef.current = built.stars
        linesRef.current = built.lines
        labelsRef.current = built.groupLabels
        if (allLow && users.length > 2) {
          labelsRef.current = [{ text: 'RISING STARS', x: w * 0.5, y: h * 0.12 }]
        }
      }
      sizeRef.current = { w, h }
    }

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / rect.width) * canvas.width
      const my = ((e.clientY - rect.top) / rect.height) * canvas.height
      hoveredRef.current = findClosestStar(dataRef.current, mx, my, 30)
    }
    const handleMouseLeave = () => {
      hoveredRef.current = null
    }

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
        s.x += s.dx
        s.y += s.dy
        wrapStar(s, W, H)
        tickTwinkle(s)
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

      labelsRef.current.forEach((lb) => {
        ctx.fillStyle = 'rgba(196,168,130,0.45)'
        ctx.font = '11px "DM Sans", Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(lb.text, lb.x, lb.y)
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
