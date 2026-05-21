import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { habitService } from '../services/habitService'
import { groupService } from '../services/groupService'

const STATIC_TITLES = {
  '/dashboard': 'Dashboard',
  '/habits': 'My Habits',
  '/stats': 'Stats',
  '/leaderboard': 'Leaderboard',
  '/settings': 'Settings',
  '/groups': 'My Groups',
  '/groups/new': 'New Group',
}

export function usePageTitle() {
  const { pathname } = useLocation()
  const params = useParams()
  const [title, setTitle] = useState('Habitly')
  const [subtitle, setSubtitle] = useState('')

  useEffect(() => {
    let cancelled = false
    setSubtitle('')

    if (STATIC_TITLES[pathname]) {
      setTitle(STATIC_TITLES[pathname])
      return
    }

    const habitMatch = pathname.match(/^\/habits\/([^/]+)$/)
    if (habitMatch) {
      setTitle('Habit Detail')
      habitService
        .getOne(habitMatch[1])
        .then((d) => {
          if (cancelled) return
          const h = d?.habit || d
          if (h?.name) {
            setTitle(h.name)
            const sub =
              h.type === 'time'
                ? `${h.target} min · ${h.scheduleType}`
                : h.type === 'count'
                  ? `${h.target} per day · ${h.scheduleType}`
                  : `Daily · ${h.scheduleType}`
            setSubtitle(sub)
          }
        })
        .catch(() => {})
      return () => {
        cancelled = true
      }
    }

    const leaderMatch = pathname.match(/^\/groups\/([^/]+)\/leader$/)
    if (leaderMatch) {
      setTitle('Group')
      groupService
        .getOne(leaderMatch[1])
        .then((g) => {
          if (!cancelled && g?.name) setTitle(`${g.name} — Leader View`)
        })
        .catch(() => {})
      return () => {
        cancelled = true
      }
    }

    const groupMatch = pathname.match(/^\/groups\/([^/]+)$/)
    if (groupMatch && !pathname.includes('/tasks/')) {
      setTitle('Group')
      groupService
        .getOne(groupMatch[1])
        .then((g) => {
          if (!cancelled && g?.name) setTitle(g.name)
        })
        .catch(() => {})
      return () => {
        cancelled = true
      }
    }

    if (pathname.includes('/tasks/new')) {
      setTitle('New Task')
      return
    }

    setTitle('Habitly')
  }, [pathname, params.id])

  return { title, subtitle }
}
