export default function ProgressRing({ done, total, size = 120 }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDE5DB" strokeWidth="8" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#8C6E52"
        strokeWidth="8"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-[#1C1917] font-mono text-lg"
        transform={`rotate(90 ${size / 2} ${size / 2})`}
      >
        {done}/{total}
      </text>
    </svg>
  )
}
