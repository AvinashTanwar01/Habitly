import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { groupService } from '../services/groupService'
import { taskService } from '../services/taskService'
import { useAuth } from '../context/AuthContext'
import PageContent from '../components/layout/PageContent'
import Avatar from '../components/ui/Avatar'

function daysLeft(deadline) {
  const d = Math.ceil((new Date(deadline) - new Date()) / 86400000)
  return d
}

export default function GroupMember() {
  const { id } = useParams()
  const { user } = useAuth()
  const [group, setGroup] = useState(null)
  const [tasks, setTasks] = useState([])

  const load = () => {
    Promise.all([groupService.getOne(id), taskService.getByGroup(id)])
      .then(([g, t]) => { setGroup(g); setTasks(t) })
  }

  useEffect(load, [id])

  if (!group) {
    return (
      <PageContent className="max-w-3xl">
        <div className="animate-pulse space-y-6">
          {/* Header Skeleton */}
          <header className="mb-6 space-y-2">
            <div className="h-7 w-48 bg-[#F2EDE6] rounded-lg" />
            <div className="h-4 w-64 bg-[#F2EDE6] rounded-md" />
          </header>

          {/* Tasks Title */}
          <div className="h-5 w-24 bg-[#F2EDE6] rounded-md mb-3" />
          {/* Tasks List */}
          <div className="space-y-2 mb-8">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white border rounded-xl p-4 flex gap-3 items-start h-20">
                <div className="w-5 h-5 rounded bg-[#F2EDE6] shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[#F2EDE6] rounded-md" />
                  <div className="h-3.5 w-48 bg-[#F2EDE6] rounded-md" />
                  <div className="h-3 w-16 bg-[#F2EDE6] rounded-md" />
                </div>
              </div>
            ))}
          </div>

          {/* Notes Title */}
          <div className="h-5 w-28 bg-[#F2EDE6] rounded-md mb-3" />
          <div className="space-y-2 mb-8">
            <div className="bg-[#F2EDE6]/40 rounded-xl p-3 h-16" />
          </div>

          {/* Members Title */}
          <div className="h-5 w-20 bg-[#F2EDE6] rounded-md mb-3" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 w-28 bg-[#F2EDE6] rounded-full" />
            ))}
          </div>
        </div>
      </PageContent>
    )
  }

  const myTasks = tasks.filter(
    (t) => !t.assignedTo || String(t.assignedTo) === String(user?.id)
  )
  const notes = (group.notes || []).filter(
    (n) => !n.visibleTo || String(n.visibleTo) === String(user?.id)
  )

  return (
    <PageContent className="max-w-3xl">
      <header className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold">{group.name}</h1>
        <p className="text-sm text-[#9A8070]">
          {group.role === 'leader' ? 'Leader' : 'Member'} · {group.memberCount}/15 members
          {group.leaderName && ` · Led by ${group.leaderName}`}
        </p>
      </header>

      <h2 className="font-medium mb-3">My tasks</h2>
      <ul className="space-y-2 mb-8">
        {myTasks.length === 0 && <p className="text-[#9A8070] text-sm">No tasks assigned.</p>}
        {myTasks.map((t) => {
          const left = daysLeft(t.deadline)
          const color = left <= 1 ? 'text-red-600' : left <= 3 ? 'text-amber-600' : 'text-green-700'
          return (
            <li key={t._id} className="bg-white border rounded-xl p-4 flex gap-3 items-start min-h-[44px]">
              <input
                type="checkbox"
                className="w-5 h-5 shrink-0 mt-0.5"
                checked={t.isDone}
                onChange={async () => { await taskService.complete(t._id); load() }}
              />
              <section className="flex-1">
                <p className={t.isDone ? 'line-through text-[#9A8070]' : 'font-medium'}>{t.title}</p>
                <p className="text-sm text-[#9A8070]">{t.description}</p>
                <p className={`text-xs mt-1 ${color}`}>{left} days left</p>
              </section>
            </li>
          )
        })}
      </ul>

      <h2 className="font-medium mb-3">Group notes</h2>
      <ul className="space-y-2 mb-8">
        {notes.map((n) => (
          <li key={n._id} className="bg-[#F2EDE6] rounded-xl p-3 text-sm">
            <p>{n.content}</p>
            <p className="text-xs text-[#9A8070] mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
          </li>
        ))}
      </ul>

      <h2 className="font-medium mb-3">Members</h2>
      <section className="flex flex-wrap gap-2">
        {group.members?.map((m) => (
          <span
            key={m.id}
            className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm ${
              m.isLeader ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white'
            }`}
          >
            <Avatar user={{ displayName: m.displayName, profileImage: m.profileImage }} size={24} />
            {m.displayName}
            {m.isLeader ? ' · Leader' : ''}
          </span>
        ))}
      </section>
    </PageContent>
  )
}
