import { useEffect, useRef } from 'react'

export function useConstellationBg() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 0.3 + Math.random() * 1.2,
      tw: Math.random() * Math.PI * 2,
    }))

    const lines = stars.slice(0, 30).map((_, i) => [i, (i + 7) % 30])

    const draw = (t) => {
      ctx.fillStyle = '#0E0C0A'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      stars.forEach((s) => {
        const a = 0.2 + Math.sin(t * 0.001 + s.tw) * 0.15
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(196,168,130,${a})`
        ctx.fill()
      })
      ctx.strokeStyle = 'rgba(196,168,130,0.08)'
      lines.forEach(([a, b]) => {
        ctx.beginPath()
        ctx.moveTo(stars[a].x, stars[a].y)
        ctx.lineTo(stars[b].x, stars[b].y)
        ctx.stroke()
      })
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return canvasRef
}
