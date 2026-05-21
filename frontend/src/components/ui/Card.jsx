export default function Card({ children, className = '' }) {
  return (
    <section className={`bg-white border border-[rgba(100,80,60,0.12)] rounded-xl p-4 ${className}`}>
      {children}
    </section>
  )
}
