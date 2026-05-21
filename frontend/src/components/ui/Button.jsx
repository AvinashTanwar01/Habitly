export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center'
  const variants = {
    primary: 'bg-[#1C1917] text-white hover:opacity-90',
    outline: 'border border-[rgba(100,80,60,0.25)] text-[#8C6E52] bg-transparent hover:bg-[#F2EDE6]',
    google: 'bg-[#F2EDE6] border-2 border-[rgba(100,80,60,0.25)] text-[#1C1917] hover:bg-[#EDE5DB]',
  }
  return (
    <button type="button" className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
