import { usePageTitle } from '../../hooks/usePageTitle'
import NotificationBell from './NotificationBell'
import ProfileMenu from './ProfileMenu'

export default function AppHeader() {
  const { title, subtitle } = usePageTitle()

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between shrink-0 h-[52px] px-4 sm:px-5 bg-[#FAF8F5] border-b border-[rgba(100,80,60,0.12)] pt-[env(safe-area-inset-top,0px)]">
      <section className="min-w-0 flex-1 pr-3">
        <h1 className="text-sm sm:text-base font-semibold text-[#1C1917] truncate leading-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-[11px] sm:text-xs text-[#9A8070] truncate mt-0.5">{subtitle}</p>
        ) : null}
      </section>
      <section className="flex items-center gap-2 sm:gap-3 shrink-0">
        <NotificationBell />
        <ProfileMenu />
      </section>
    </header>
  )
}
