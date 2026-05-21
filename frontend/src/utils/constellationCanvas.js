/** Shared helpers for Habitly constellation canvases */

export const SKY_BG = '#0A0908'

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export function initBgStars(W, H, count = 100) {
  const n = Math.min(120, Math.max(80, count))
  return Array.from({ length: n }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 0.9 + 0.3,
    alpha: Math.random() * 0.2 + 0.1,
    minAlpha: 0.05,
    maxAlpha: 0.35,
    dx: (Math.random() - 0.5) * 0.12,
    dy: (Math.random() - 0.5) * 0.12,
    twinkleSpeed: Math.random() * 0.015 + 0.006,
    twinkleDir: Math.random() > 0.5 ? 1 : -1,
  }))
}

export function wrapStar(s, W, H) {
  if (s.x < 0) s.x = W
  if (s.x > W) s.x = 0
  if (s.y < 0) s.y = H
  if (s.y > H) s.y = 0
}

/** Gentle bounce inside canvas — keeps cluster stars near their group */
export function bounceStar(s, W, H, margin = 12) {
  s.x += s.dx
  s.y += s.dy
  if (s.x < margin) {
    s.x = margin
    s.dx = Math.abs(s.dx) || 0.03
  }
  if (s.x > W - margin) {
    s.x = W - margin
    s.dx = -Math.abs(s.dx) || -0.03
  }
  if (s.y < margin) {
    s.y = margin
    s.dy = Math.abs(s.dy) || 0.03
  }
  if (s.y > H - margin) {
    s.y = H - margin
    s.dy = -Math.abs(s.dy) || -0.03
  }
}

/** Draw habit names under each drifting cluster (centroid of its stars). */
export function drawClusterLabels(ctx, stars) {
  const groups = new Map()
  stars.forEach((s) => {
    const key = s.habitId || s.habit?._id || s.habit?.id
    if (!key) return
    if (!groups.has(key)) {
      groups.set(key, { name: s.habit?.name || 'Habit', xs: [], ys: [] })
    }
    const g = groups.get(key)
    g.xs.push(s.x)
    g.ys.push(s.y)
  })

  groups.forEach((g) => {
    if (!g.xs.length) return
    const cx = g.xs.reduce((a, b) => a + b, 0) / g.xs.length
    const maxY = Math.max(...g.ys)
    const labelY = Math.min(maxY + 16, ctx.canvas?.height ? ctx.canvas.height - 8 : maxY + 16)
    ctx.fillStyle = 'rgba(255,240,200,0.7)'
    ctx.font = '11px "DM Sans", Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(String(g.name).slice(0, 16), cx, labelY)
  })
}

export function tickTwinkle(s) {
  s.alpha += s.twinkleSpeed * s.twinkleDir
  if (s.alpha > s.maxAlpha || s.alpha < s.minAlpha) s.twinkleDir *= -1
}

export function drawSkyBackground(ctx, W, H) {
  ctx.fillStyle = SKY_BG
  ctx.fillRect(0, 0, W, H)
}

export function drawBgStars(ctx, bgStars, W, H) {
  bgStars.forEach((s) => {
    s.x += s.dx
    s.y += s.dy
    wrapStar(s, W, H)
    tickTwinkle(s)
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,248,230,${s.alpha})`
    ctx.fill()
  })
}

export function drawAnimatedLines(ctx, lines, time = Date.now()) {
  lines.forEach((line, i) => {
    const a = line.x1 ?? line.starA?.x ?? 0
    const b = line.y1 ?? line.starA?.y ?? 0
    const c = line.x2 ?? line.starB?.x ?? 0
    const d = line.y2 ?? line.starB?.y ?? 0
    const alpha = 0.08 + 0.12 * Math.sin(time / 2200 + i * 0.8)
    ctx.beginPath()
    ctx.moveTo(a, b)
    ctx.lineTo(c, d)
    ctx.strokeStyle = `rgba(196,168,130,${alpha})`
    ctx.lineWidth = 0.6
    ctx.stroke()
  })
}

/** Lines between data star objects (updates positions each frame) */
export function drawAnimatedLinesFromStars(ctx, linePairs, time = Date.now()) {
  linePairs.forEach((pair, i) => {
    const alpha = 0.04 + 0.06 * Math.sin(time / 2200 + i * 0.8)
    ctx.beginPath()
    ctx.moveTo(pair[0].x, pair[0].y)
    ctx.lineTo(pair[1].x, pair[1].y)
    ctx.strokeStyle = `rgba(196,168,130,${alpha})`
    ctx.lineWidth = 0.5
    ctx.stroke()
  })
}

export function drawDataStar(ctx, s, hovered = false) {
  const r = hovered ? s.r + 3 : s.r
  const glow = hovered ? (s.glow || 12) + 10 : s.glow || 12
  const alpha = s.alpha

  ctx.save()
  ctx.shadowBlur = glow
  ctx.shadowColor = s.glowColor || 'rgba(255,200,80,0.6)'
  ctx.beginPath()
  ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
  ctx.fillStyle = s.fill || `rgba(255,220,120,${alpha})`
  ctx.fill()
  ctx.restore()

  if (s.label) {
    ctx.fillStyle = `rgba(255,240,200,${Math.max(0.65, alpha * 0.85)})`
    ctx.font = s.labelFont || '10px "DM Sans", Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(s.label, s.x, s.y + r + 10)
  }
}

export function drawCenteredMessage(ctx, W, H, text, fontSize = 13) {
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.font = `${fontSize}px "DM Sans", Inter, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lines = text.split('\n')
  const lh = fontSize + 6
  const startY = H / 2 - ((lines.length - 1) * lh) / 2
  lines.forEach((line, i) => ctx.fillText(line, W / 2, startY + i * lh))
}

export function drawTooltip(ctx, star, lines, W) {
  const padding = 8
  const lineHeight = 16
  const tw = 148
  const th = padding * 2 + lines.length * lineHeight
  let tx = star.x - tw / 2
  let ty = star.y - th - star.r - 12
  if (ty < 5) ty = star.y + star.r + 12
  if (tx < 5) tx = 5
  if (tx + tw > W - 5) tx = W - tw - 5

  ctx.save()
  ctx.fillStyle = 'rgba(28,25,23,0.92)'
  ctx.strokeStyle = 'rgba(196,168,130,0.35)'
  ctx.lineWidth = 1
  roundRect(ctx, tx, ty, tw, th, 6)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = '11px "DM Sans", Inter, system-ui, sans-serif'
  ctx.textAlign = 'left'
  lines.forEach((line, i) => {
    ctx.fillText(line, tx + padding, ty + padding + 12 + i * lineHeight)
  })
  ctx.restore()
}

export function formatShortDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[m - 1]} ${d}`
}

export function findClosestStar(stars, mx, my, radius = 30) {
  let best = null
  let bestD = radius * radius
  for (const s of stars) {
    const dx = mx - s.x
    const dy = my - s.y
    const d = dx * dx + dy * dy
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  return best
}

export function scaleStars(stars, oldW, oldH, newW, newH) {
  if (!oldW || !oldH) return
  const sx = newW / oldW
  const sy = newH / oldH
  stars.forEach((s) => {
    s.x *= sx
    s.y *= sy
  })
}

export function constellationFromCategory(cat) {
  const c = (cat || '').toLowerCase()
  if (c === 'study' || /scholar|read|learn|writ/.test(c)) return 'The Scholars'
  if (c === 'fitness' || /athlet|sport|gym|run|exerc/.test(c)) return 'The Athletes'
  if (c === 'wellness' || /seek|meditat|mind|sleep/.test(c)) return 'The Seekers'
  return 'The Wanderers'
}

export const CONSTELLATION_ZONES = {
  'The Scholars': { x0: 0.15, x1: 0.4, y0: 0.1, y1: 0.45 },
  'The Athletes': { x0: 0.6, x1: 0.85, y0: 0.1, y1: 0.45 },
  'The Seekers': { x0: 0.15, x1: 0.4, y0: 0.55, y1: 0.88 },
  'The Wanderers': { x0: 0.6, x1: 0.85, y0: 0.55, y1: 0.88 },
}

export function streakRadius(streak) {
  if (streak >= 60) return { r: 7, glow: 18 }
  if (streak >= 14) return { r: 4.5, glow: 14 }
  if (streak >= 7) return { r: 3, glow: 10 }
  return { r: 2, glow: 6 }
}
