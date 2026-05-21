/** Full-width page shell for main app content (beside sidebar). */
export default function PageContent({ children, className = '' }) {
  return (
    <section className={`w-full min-h-full p-6 lg:p-8 ${className}`.trim()}>
      {children}
    </section>
  )
}
