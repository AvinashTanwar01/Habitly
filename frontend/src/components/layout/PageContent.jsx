/** Full-width page shell for main app content (beside sidebar). */
export default function PageContent({ children, className = '' }) {
  return (
    <section
      className={`w-full min-h-full max-w-[1600px] mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 overflow-x-hidden ${className}`.trim()}
    >
      {children}
    </section>
  )
}
