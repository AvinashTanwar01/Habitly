import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { groupService } from '../services/groupService'
import { taskService } from '../services/taskService'
import { useAuth } from '../context/AuthContext'
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

  if (!group) return <p className="p-8 text-[#9A8070]">Loading...</p>

  const myTasks = tasks.filter(
    (t) => !t.assignedTo || String(t.assignedTo) === String(user?.id)
  )
  const notes = (group.notes || []).filter(
    (n) => !n.visibleTo || String(n.visibleTo) === String(user?.id)
  )

  return (
    <section className="p-6 max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">{group.name}</h1>
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
            <li key={t._id} className="bg-white border rounded-xl p-4 flex gap-3 items-start">
              <input
                type="checkbox"
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
    </section>
  )
}
