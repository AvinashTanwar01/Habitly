import { usePageTitle } from '../../hooks/usePageTitle'
import NotificationBell from './NotificationBell'
import ProfileMenu from './ProfileMenu'

export default function AppHeader() {
  const { title, subtitle } = usePageTitle()

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between shrink-0"
      style={{
        height: 52,
        padding: '0 20px',
        background: '#FAF8F5',
        borderBottom: '0.5px solid rgba(100,80,60,0.12)',
      }}
    >
      <section className="min-w-0 flex-1 pr-4">
        <h1 className="text-base font-semibold text-[#1C1917] truncate leading-tight">{title}</h1>
        {subtitle ? (
          <p className="text-xs text-[#9A8070] truncate mt-0.5">{subtitle}</p>
        ) : null}
      </section>
      <section className="flex items-center gap-3 shrink-0">
        <NotificationBell />
        <ProfileMenu />
      </section>
    </header>
  )
}
