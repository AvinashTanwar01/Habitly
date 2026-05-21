import { useEffect, useRef } from 'react'
import { drawPlaceholderSky } from '../../utils/placeholderSky'

/** Decorative constellation canvas for landing marketing cards */
export default function LandingSkyPreview({ height = 200, subtitle = 'Your night sky awaits' }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const paint = () => {
      const parent = canvas.parentElement
      const w = parent?.clientWidth || 400
      canvas.width = w
      canvas.height = height
      drawPlaceholderSky(canvas.getContext('2d'), w, height, 'landing-sky', subtitle)
    }
    paint()
    window.addEventListener('resize', paint)
    return () => window.removeEventListener('resize', paint)
  }, [height, subtitle])

  return (
    <canvas
      ref={ref}
      className="w-full rounded-xl"
      style={{ height, display: 'block' }}
      aria-hidden
    />
  )
}
