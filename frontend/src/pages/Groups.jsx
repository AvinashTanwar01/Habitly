import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { groupService } from '../services/groupService'
import PageContent from '../components/layout/PageContent'
import Button from '../components/ui/Button'

const DOTS = ['#C4A882', '#8C6E52', '#9A8070']

export default function Groups() {
  const [groups, setGroups] = useState([])
  const [usage, setUsage] = useState({ used: 0, limit: 3 })
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([groupService.getAll(), groupService.getUsage()])
      .then(([g, u]) => { setGroups(g); setUsage(u) })
      .catch(() => {})
  }, [])

  return (
    <PageContent>
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
        <h1 className="text-xl sm:text-2xl font-semibold">My Groups</h1>
        <Button onClick={() => navigate('/groups/new')} className="w-full sm:w-auto min-h-[44px]">
          New Group
        </Button>
      </header>
      <p className="text-sm text-[#9A8070] mb-6">{usage.used} of {usage.limit} group creations used this month</p>

      {groups.length === 0 ? (
        <p className="text-center text-[#9A8070] py-12">No groups yet. Create one to track habits with friends or teammates.</p>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g, i) => (
            <Link
              key={g._id}
              to={g.role === 'leader' ? `/groups/${g._id}/leader` : `/groups/${g._id}`}
              className="bg-white border rounded-xl p-4 hover:border-[#8C6E52]"
            >
              <span className="inline-block w-2 h-2 rounded-full mb-2" style={{ background: DOTS[i % DOTS.length] }} />
              <h2 className="font-medium">{g.name}</h2>
              <p className="text-sm text-[#9A8070]">
                {g.memberCount}/15 members · {g.role === 'leader' ? 'You lead' : 'Member'}
              </p>
              {g.pendingTaskCount > 0 && (
                <span className="text-xs bg-[#F2EDE6] px-2 py-0.5 rounded mt-2 inline-block">{g.pendingTaskCount} pending</span>
              )}
            </Link>
          ))}
        </section>
      )}
    </PageContent>
  )
}
