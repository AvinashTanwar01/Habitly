/** Seeded RNG for consistent decorative star fields */
export function makeRng(seedStr = 'habitly') {
  let h = 2166136261
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return (h >>> 0) / 4294967296
  }
}

/** Draw a static decorative constellation (Orion-style clusters) on canvas ctx */
export function drawPlaceholderSky(ctx, width, height, seed = 'sky', subtitle = 'Start yours') {
  ctx.fillStyle = '#0A0908'
  ctx.fillRect(0, 0, width, height)

  const cx = width / 2
  const cy = height / 2
  const rnd = makeRng(seed)

  const clusters = [
    { ox: -0.22, oy: -0.12, n: 5 },
    { ox: 0.2, oy: -0.08, n: 4 },
    { ox: -0.08, oy: 0.18, n: 6 },
    { ox: 0.28, oy: 0.14, n: 4 },
  ]

  const stars = []
  clusters.forEach((cl, ci) => {
    const bx = cx + cl.ox * width
    const by = cy + cl.oy * height
    for (let i = 0; i < cl.n; i++) {
      const a = (i / cl.n) * Math.PI * 2 + rnd() * 0.4
      const r = 18 + rnd() * 42
      stars.push({
        x: bx + Math.cos(a) * r,
        y: by + Math.sin(a) * r * 0.65,
        size: 1 + rnd() * 2.2,
        alpha: 0.35 + rnd() * 0.45,
      })
    }
  })

  for (let i = 0; i < stars.length - 1; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const a = stars[i]
      const b = stars[j]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (dist < 70) {
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = `rgba(196,168,130,${0.12 - dist / 800})`
        ctx.lineWidth = 0.6
        ctx.stroke()
      }
    }
  }

  stars.forEach((s) => {
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,235,200,${s.alpha})`
    ctx.fill()
  })

  for (let i = 0; i < 40; i++) {
    ctx.beginPath()
    ctx.arc(rnd() * width, rnd() * height, 0.4 + rnd() * 0.8, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${0.08 + rnd() * 0.12})`
    ctx.fill()
  }

  ctx.fillStyle = 'rgba(196,168,130,0.95)'
  ctx.font = '600 15px DM Sans, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Start yours', cx, cy - 4)
  ctx.fillStyle = 'rgba(154,128,112,0.85)'
  ctx.font = '13px DM Sans, system-ui, sans-serif'
  ctx.fillText(subtitle, cx, cy + 18)
  ctx.textAlign = 'left'
}
