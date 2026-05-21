import { Link } from 'react-router-dom'
import { usePageTitle } from '../../hooks/usePageTitle'
import NotificationBell from './NotificationBell'
import ProfileMenu from './ProfileMenu'

export default function AppHeader() {
  const { title, subtitle } = usePageTitle()

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between shrink-0 h-[52px] px-4 sm:px-5 bg-[#FAF8F5] border-b border-[rgba(100,80,60,0.12)] pt-[env(safe-area-inset-top,0px)]">
      <section className="min-w-0 flex-1 pr-3 flex items-center gap-2">
        <span className="md:hidden w-8 h-8 rounded-lg bg-[#F2EDE6] flex items-center justify-center text-base shrink-0 border border-[rgba(100,80,60,0.1)]">🌱</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm sm:text-base font-semibold text-[#1C1917] truncate leading-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-[11px] sm:text-xs text-[#9A8070] truncate mt-0.5">{subtitle}</p>
          ) : null}
        </div>
      </section>
      <section className="flex items-center gap-2 sm:gap-3 shrink-0">
        <NotificationBell />
        <Link
          to="/settings"
          className="hidden max-md:flex w-9 h-9 sm:w-[34px] sm:h-[34px] rounded-full bg-[#F2EDE6] border border-[rgba(100,80,60,0.15)] items-center justify-center text-[#8C6E52] text-[15px] hover:text-[#1C1917] transition-colors"
          aria-label="Settings"
        >
          <i className="ti ti-settings" />
        </Link>
        <ProfileMenu />
      </section>
    </header>
  )
}
