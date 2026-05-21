export default function Input({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="text-xs text-[#9A8070] mb-1 block">{label}</span>}
      <input
        className={`w-full px-3 py-2 rounded-lg border border-[rgba(100,80,60,0.12)] bg-white text-[#1C1917] text-sm focus:outline-none focus:border-[#8C6E52] ${className}`}
        {...props}
      />
    </label>
  )
}
