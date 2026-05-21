import { useToast } from '../../context/ToastContext'

const styles = {
  success: 'bg-[#1C1917] text-[#FAF8F5] border-[#C4A882]/40',
  error: 'bg-[#3d2020] text-[#FAF8F5] border-red-300/30',
  info: 'bg-[#2a2624] text-[#EDE5DB] border-[#8C6E52]/40',
}

const icons = {
  success: '✓',
  error: '!',
  info: '◆',
}

export default function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (!toasts.length) return null

  return (
    <section
      className="fixed z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-1.5rem)] pointer-events-none left-3 right-3 sm:left-auto sm:right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-auto md:top-4"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <article
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm animate-[slideIn_0.25s_ease-out] ${styles[t.type] || styles.info}`}
        >
          <span className="w-6 h-6 rounded-full bg-[#C4A882]/25 text-[#C4A882] flex items-center justify-center shrink-0 font-semibold text-xs">
            {icons[t.type] || icons.info}
          </span>
          <p className="flex-1 leading-snug pt-0.5">{t.message}</p>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="text-[#9A8070] hover:text-white shrink-0 text-lg leading-none min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
            aria-label="Dismiss"
          >
            ×
          </button>
        </article>
      ))}
    </section>
  )
}
