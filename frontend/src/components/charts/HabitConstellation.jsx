import { useEffect, useRef } from 'react'
import { addDays, formatDate, isScheduled } from '../../utils/streakUtils'
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
  wrapStar,
  tickTwinkle,
} from '../../utils/constellationCanvas'

function buildDataStars(W, H, scheduledDays, doneByDate, target) {
  const arcWidth = W * 0.82
  const arcHeight = H * 0.32
  const startX = W * 0.09
  const startY = H * 0.62

  const completed = scheduledDays
    .map((date, i) => {
      const c = doneByDate.get(date)
      const t = scheduledDays.length > 1 ? i / (scheduledDays.length - 1) : 0.5
      const x = startX + t * arcWidth
      const y = startY - Math.sin(t * Math.PI) * arcHeight
      const done = !!c?.isDone
      const ratio = Math.max(0, Math.min(1, (Number(c?.actualAmount || 0) || 0) / (Number(target) || 1)))
      const isRecent = i >= scheduledDays.length - 3
      return {
        date,
        x,
        y,
        done,
        c,
        i,
        r: done ? Math.min(7, Math.max(3, 3 + ratio * 4)) : 1.5,
        alpha: done ? (isRecent ? 0.92 : 0.78) : 0.2,
        minAlpha: done ? 0.65 : 0.12,
        maxAlpha: done ? 0.95 : 0.25,
        glow: done ? (isRecent ? 16 : 12) : 0,
        fill: done ? undefined : 'rgba(255,255,255,0.2)',
        dx: (Math.random() - 0.5) * 0.06,
        dy: (Math.random() - 0.5) * 0.06,
        twinkleSpeed: Math.random() * 0.012 + 0.008,
        twinkleDir: Math.random() > 0.5 ? 1 : -1,
        label: done ? formatShortDate(date) : '',
        tooltipLines: done
          ? [
              c?.date || date,
              `Amount: ${c?.actualAmount ?? '—'}`,
            ]
          : null,
      }
    })
    .sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1))

  return completed
}

export default function HabitConstellation({
  completions = [],
  target = 1,
  scheduleType,
  scheduleDays,
  habitName = '',
}) {
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

    const today = formatDate(new Date())
    const last60 = []
    for (let i = 59; i >= 0; i--) last60.push(addDays(today, -i))
    const scheduledDays = last60.filter((d) => isScheduled(d, scheduleType, scheduleDays))
    const doneByDate = new Map((completions || []).map((c) => [c.date, c]))
    const hasAnyDone = (completions || []).some((c) => c.isDone)

    const resize = () => {
      const oldW = sizeRef.current.w
      const oldH = sizeRef.current.h
      const w = canvas.offsetWidth || 400
      const h = Math.max(260, canvas.offsetHeight || 260)
      canvas.width = w
      canvas.height = h
      bgRef.current = initBgStars(w, h)
      if (oldW && oldH && dataRef.current.length) {
        scaleStars(dataRef.current, oldW, oldH, w, h)
      } else {
        dataRef.current = buildDataStars(w, h, scheduledDays, doneByDate, target)
      }
      linesRef.current = []
      let run = []
      dataRef.current.forEach((s) => {
        if (s.done) {
          run.push(s)
        } else {
          for (let i = 1; i < run.length; i++) linesRef.current.push([run[i - 1], run[i]])
          run = []
        }
      })
      for (let i = 1; i < run.length; i++) linesRef.current.push([run[i - 1], run[i]])
      sizeRef.current = { w, h }
    }

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / rect.width) * canvas.width
      const my = ((e.clientY - rect.top) / rect.height) * canvas.height
      hoveredRef.current = findClosestStar(
        dataRef.current.filter((s) => s.done),
        mx,
        my,
        30
      )
    }
    const handleMouseLeave = () => {
      hoveredRef.current = null
    }

    const draw = () => {
      const W = canvas.width
      const H = canvas.height
      drawSkyBackground(ctx, W, H)
      drawBgStars(ctx, bgRef.current, W, H)

      if (!hasAnyDone) {
        drawCenteredMessage(ctx, W, H, 'Start completing this habit\nto grow your constellation')
        animId = requestAnimationFrame(draw)
        return
      }

      if (linesRef.current.length) {
        drawAnimatedLinesFromStars(ctx, linesRef.current)
      }

      const hovered = hoveredRef.current
      dataRef.current.forEach((s) => {
        s.x += s.dx
        s.y += s.dy
        wrapStar(s, W, H)
        tickTwinkle(s)
        const isHov = hovered === s
        drawDataStar(ctx, s, isHov)
      })

      if (hovered?.tooltipLines) {
        const lines = [habitName || 'Habit', ...hovered.tooltipLines]
        drawTooltip(ctx, hovered, lines, W)
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
  }, [completions, target, scheduleType, scheduleDays, habitName])

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl cursor-crosshair"
      style={{ width: '100%', height: '260px', minHeight: '260px', display: 'block' }}
    />
  )
}
