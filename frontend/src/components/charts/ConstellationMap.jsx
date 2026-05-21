import { useEffect, useRef } from 'react'
import {
  initBgStars,
  drawSkyBackground,
  drawBgStars,
  drawAnimatedLinesFromStars,
  drawDataStar,
  drawCenteredMessage,
  drawTooltip,
  findClosestStar,
  formatShortDate,
  scaleStars,
  bounceStar,
  drawClusterLabels,
  tickTwinkle,
} from '../../utils/constellationCanvas'

function buildClusters(habits, W, H) {
  const active = habits.filter((h) => (h.completions || []).some((c) => c.isDone))
  if (!active.length) return { stars: [], lines: [], clusterLabels: [] }

  const cols = Math.ceil(Math.sqrt(active.length))
  const rows = Math.ceil(active.length / cols)
  const padX = W * 0.08
  const padY = H * 0.12
  const cellW = (W - padX * 2) / cols
  const cellH = (H - padY * 2) / rows

  const stars = []
  const lines = []

  active.forEach((habit, hi) => {
    const completions = (habit.completions || []).filter((c) => c.isDone).slice(-24)
    const col = hi % cols
    const row = Math.floor(hi / cols)
    const cx = padX + cellW * (col + 0.5) + (Math.random() - 0.5) * cellW * 0.15
    const cy = padY + cellH * (row + 0.5) + (Math.random() - 0.5) * cellH * 0.12
    const spread = 12 + completions.length * 1.2
    const clusterStars = []

    completions.forEach((c, i) => {
      const angle = completions.length > 1 ? (i / completions.length) * Math.PI * 1.6 - 0.4 : 0
      const r = spread * (0.35 + (i / Math.max(1, completions.length)) * 0.65)
      const star = {
        habit,
        habitId: habit._id || habit.id,
        date: c.date,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r * 0.7,
        r: 3 + Math.min(3, i / 8),
        alpha: 0.82,
        minAlpha: 0.65,
        maxAlpha: 0.95,
        glow: 12,
        dx: (Math.random() - 0.5) * 0.05,
        dy: (Math.random() - 0.5) * 0.05,
        twinkleSpeed: Math.random() * 0.01 + 0.008,
        twinkleDir: Math.random() > 0.5 ? 1 : -1,
        label: '',
        tooltipLines: [
          habit.name,
          formatShortDate(c.date),
          `Streak: ${habit.currentStreak ?? '—'}`,
        ],
      }
      clusterStars.push(star)
      stars.push(star)
    })

    for (let i = 1; i < clusterStars.length; i++) {
      lines.push([clusterStars[i - 1], clusterStars[i]])
    }

  })

  return { stars, lines }
}

export default function ConstellationMap({ habits = [] }) {
  const canvasRef = useRef(null)
  const bgRef = useRef([])
  const dataRef = useRef([])
  const linesRef = useRef([])
  const hoveredRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId = 0
    sizeRef.current = { w: 0, h: 0 }

    const totalDone = habits.reduce(
      (n, h) => n + (h.completions || []).filter((c) => c.isDone).length,
      0
    )

    const resize = () => {
      const oldW = sizeRef.current.w
      const oldH = sizeRef.current.h
      const w = canvas.offsetWidth || 900
      const h = 320
      canvas.width = w
      canvas.height = h
      bgRef.current = initBgStars(w, h)
      if (oldW && oldH && dataRef.current.length) {
        scaleStars(dataRef.current, oldW, oldH, w, h)
      } else {
        const built = buildClusters(habits, w, h)
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
    const handleMouseLeave = () => {
      hoveredRef.current = null
    }

    const draw = () => {
      const W = canvas.width
      const H = canvas.height
      drawSkyBackground(ctx, W, H)
      drawBgStars(ctx, bgRef.current, W, H)

      if (totalDone === 0) {
        drawCenteredMessage(ctx, W, H, 'Complete some habits\nto build your universe')
        animId = requestAnimationFrame(draw)
        return
      }

      if (linesRef.current.length) {
        drawAnimatedLinesFromStars(ctx, linesRef.current)
      }

      const hovered = hoveredRef.current
      dataRef.current.forEach((s) => {
        bounceStar(s, W, H)
        tickTwinkle(s)
        drawDataStar(ctx, s, hovered === s)
      })

      drawClusterLabels(ctx, dataRef.current)

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
  }, [habits])

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl cursor-crosshair h-[220px] sm:h-[280px] md:h-[320px]"
      style={{ width: '100%', display: 'block' }}
    />
  )
}
