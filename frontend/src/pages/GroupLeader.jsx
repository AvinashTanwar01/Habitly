import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { groupService } from '../services/groupService'
import { taskService } from '../services/taskService'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import PageContent from '../components/layout/PageContent'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Input from '../components/ui/Input'

export default function GroupLeader() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [group, setGroup] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [tasks, setTasks] = useState([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [tab, setTab] = useState('username')
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [email, setEmail] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [invitedUsernames, setInvitedUsernames] = useState(new Set())
  const [noteContent, setNoteContent] = useState('')
  const [noteVisible, setNoteVisible] = useState('everyone')
  const [taskForm, setTaskForm] = useState({ title: '', description: '', deadline: '', assignedTo: '' })
  const [msg, setMsg] = useState('')
  const { toast } = useToast()

  const sentEmails = new Set((group?.invitedEmails || []).map((e) => String(e).toLowerCase()))
  const emailNorm = email.trim().toLowerCase()
  const emailAlreadySent = emailNorm && sentEmails.has(emailNorm)

  const load = () => {
    groupService
      .getOne(id)
      .then((g) => {
        if (g.role !== 'leader') {
          navigate(`/groups/${id}`, { replace: true })
          return
        }
        setGroup(g)
      })
      .catch(() => setGroup(null))
    taskService.getByGroup(id).then(setTasks).catch(() => setTasks([]))
  }

  useEffect(load, [id, navigate])

  const searchUsers = async () => {
    const r = await api.get('/users/search', { params: { q: searchQ } })
    setSearchResults(r.data)
  }

  const inviteUser = async (username, userId) => {
    const key = userId || username
    if (invitedUsernames.has(key)) {
      toast.info('Already added to this group')
      return
    }
    try {
      const r = await groupService.inviteByUsername(id, username)
      setInvitedUsernames((s) => new Set(s).add(key))
      setMsg(r.message || 'Invited')
      toast.success(r.message || `${username} added to the group`)
      load()
    } catch (err) {
      const data = err.response?.data
      if (data?.alreadyMember) toast.info('User is already in this group')
      else toast.error(data?.message || 'Failed to invite')
    }
  }

  const sendEmailInvite = async () => {
    if (!emailNorm) {
      toast.error('Enter an email address')
      return
    }
    if (emailAlreadySent) {
      toast.info('Invite already sent to this email')
      return
    }
    setEmailSending(true)
    try {
      const r = await groupService.inviteByEmail(id, emailNorm)
      if (r.alreadySent) {
        toast.info('Invite already sent to this email')
      } else {
        setMsg(r.inviteUrl ? `Invite link: ${r.inviteUrl}` : r.message)
        toast.success(r.message || 'Invite email sent')
        load()
      }
    } catch (err) {
      const data = err.response?.data
      if (data?.alreadySent) toast.info('Invite already sent to this email')
      else if (data?.alreadyMember) toast.info('This user is already in the group')
      else toast.error(data?.message || 'Failed to send invite')
    } finally {
      setEmailSending(false)
    }
  }

  const saveTask = async (e) => {
    e.preventDefault()
    try {
      await taskService.create(id, {
        ...taskForm,
        assignedTo: taskForm.assignedTo || null,
      })
      setTaskOpen(false)
      setTaskForm({ title: '', description: '', deadline: '', assignedTo: '' })
      toast.success('Task created — members notified')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task')
    }
  }

  const addNote = async () => {
    if (!noteContent.trim()) {
      toast.error('Write a note first')
      return
    }
    try {
      await groupService.createNote(id, {
        content: noteContent,
        visibleTo: noteVisible === 'everyone' ? null : noteVisible,
      })
      setNoteContent('')
      toast.success('Note posted — members notified')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post note')
    }
  }

  const deleteGroup = async () => {
    if (deleteConfirm !== group?.name) {
      toast.error('Type the exact group name to confirm')
      return
    }
    setDeleting(true)
    try {
      const r = await groupService.deleteGroup(id)
      toast.success(r.message || 'Group deleted')
      navigate('/groups')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete group')
    } finally {
      setDeleting(false)
    }
  }

  if (!group) {
    return (
      <PageContent>
        <p className="text-[#9A8070]">Loading...</p>
      </PageContent>
    )
  }

  const uid = String(user?.id || user?._id || '')

  return (
    <PageContent>
      <header className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <section>
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <p className="text-sm text-[#9A8070] mt-1">
            Led by {group.leaderName || group.members?.find((m) => m.isLeader)?.displayName || 'you'}
            {' · '}{group.memberCount}/15 members
          </p>
        </section>
        <Button onClick={() => setInviteOpen(true)} className="w-full sm:w-auto min-h-[44px]">
          Invite members
        </Button>
      </header>

      {msg && <p className="text-sm bg-[#F2EDE6] p-2 rounded mb-4">{msg}</p>}

      <h2 className="font-medium mb-3">Members</h2>
      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {group.members?.map((m) => {
          const memberTasks = tasks.filter((t) => !t.assignedTo || String(t.assignedTo) === String(m.id))
          const done = memberTasks.filter((t) =>
            t.completions?.some((c) => String(c.userId) === String(m.id))
          ).length
          const total = memberTasks.length || 1
          const isYou = String(m.id) === uid
          return (
            <article key={m.id} className="bg-white border rounded-xl p-4">
              <header className="flex items-center gap-2 mb-1">
                <Avatar user={{ displayName: m.displayName, profileImage: m.profileImage }} size={32} />
                <p className="font-medium">{m.displayName}</p>
                {m.isLeader && (
                  <span className="text-[10px] uppercase bg-[#1C1917] text-white px-1.5 py-0.5 rounded">Leader</span>
                )}
                {isYou && !m.isLeader && (
                  <span className="text-[10px] uppercase bg-[#C4A882]/30 text-[#5a4a3a] px-1.5 py-0.5 rounded">You</span>
                )}
              </header>
              <p className="text-sm text-[#9A8070]">{done}/{total} tasks</p>
              <section className="h-1.5 bg-[#EDE5DB] rounded-full mt-2">
                <section
                  className="h-full bg-[#8C6E52] rounded-full"
                  style={{ width: `${(done / total) * 100}%` }}
                />
              </section>
            </article>
          )
        })}
      </section>

      <header className="flex justify-between mb-3">
        <h2 className="font-medium">All tasks</h2>
        <Button onClick={() => setTaskOpen(true)}>Add task</Button>
      </header>
      <ul className="space-y-2 mb-8">
        {tasks.map((t) => (
          <li key={t._id} className="bg-white border rounded-xl p-4 flex justify-between">
            <section>
              <p className="font-medium">{t.title}</p>
              <p className="text-xs text-[#9A8070]">{t.assignedToName} · {t.completionCount}/{t.memberCount} done</p>
            </section>
            <button
              type="button"
              className="text-[#8C6E52] text-sm"
              onClick={async () => {
                await taskService.delete(t._id)
                toast.info('Task deleted')
                load()
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <h2 className="font-medium mb-3">Notes</h2>
      <section className="bg-white border rounded-xl p-4 mb-4">
        <textarea
          className="w-full border rounded p-2 text-sm mb-2"
          rows={3}
          placeholder="Share an update with the group..."
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
        />
        <select
          className="border rounded text-sm mb-2 mr-2"
          value={noteVisible}
          onChange={(e) => setNoteVisible(e.target.value)}
        >
          <option value="everyone">Everyone</option>
          {group.members?.filter((m) => !m.isLeader).map((m) => (
            <option key={m.id} value={m.id}>{m.displayName}</option>
          ))}
        </select>
        <Button onClick={addNote}>Post note</Button>
      </section>
      <ul className="space-y-2 mb-10">
        {(group.notes || []).map((n) => (
          <li key={n._id} className="text-sm bg-[#F2EDE6] p-3 rounded-lg flex justify-between gap-2">
            <span>{n.content}</span>
            <button
              type="button"
              className="text-[#8C6E52] shrink-0"
              onClick={async () => {
                await groupService.deleteNote(id, n._id)
                load()
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <article className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <h2 className="font-medium text-red-900 flex items-center gap-2 mb-2">
          <i className="ti ti-alert-triangle" /> Danger zone
        </h2>
        <p className="text-sm text-red-800 mb-4">
          Permanently delete this group, all tasks, notes, and member links. Other members will be notified.
        </p>
        <Button
          type="button"
          className="bg-red-700 hover:bg-red-800"
          onClick={() => { setDeleteOpen(true); setDeleteConfirm('') }}
        >
          Delete group
        </Button>
      </article>

      {deleteOpen && (
        <section className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4 z-50 pb-nav-safe sm:pb-4">
          <section className="bg-white rounded-2xl rounded-b-none sm:rounded-b-2xl p-6 max-w-sm w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-[#1C1917] mb-2">Delete group?</h3>
            <p className="text-sm text-[#9A8070] mb-3">
              Type <strong>{group.name}</strong> below to confirm.
            </p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={group.name}
              className="mb-4"
            />
            <section className="flex gap-2">
              <Button
                variant="outline"
                type="button"
                className="flex-1"
                onClick={() => { setDeleteOpen(false); setDeleteConfirm('') }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 bg-red-700 hover:bg-red-800"
                onClick={deleteGroup}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete forever'}
              </Button>
            </section>
          </section>
        </section>
      )}

      {inviteOpen && (
        <section className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4 z-50 pb-nav-safe sm:pb-4">
          <section className="bg-white rounded-t-2xl sm:rounded-xl p-6 w-full max-w-md max-h-[min(90dvh,calc(100dvh-2rem))] overflow-y-auto">
            <nav className="flex gap-2 mb-4">
              {['username', 'email'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded text-sm ${tab === t ? 'bg-[#1C1917] text-white' : 'bg-[#EDE5DB]'}`}
                >
                  {t === 'username' ? 'By username' : 'By email'}
                </button>
              ))}
            </nav>
            {tab === 'username' ? (
              <section>
                <section className="flex flex-col sm:flex-row gap-2 mb-3">
                  <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search display name" className="flex-1" />
                  <Button type="button" onClick={searchUsers} className="w-full sm:w-auto min-h-[44px]">Search</Button>
                </section>
                {searchResults.map((u) => {
                  const inGroup = group.members?.some((m) => String(m.id) === String(u.id))
                  const invited = invitedUsernames.has(u.id) || inGroup
                  return (
                    <section key={u.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 border rounded mb-2">
                      <span className="truncate">{u.displayName}</span>
                      <Button
                        type="button"
                        disabled={invited}
                        onClick={() => inviteUser(u.displayName, u.id)}
                      >
                        {inGroup ? 'In group' : invited ? 'Added' : 'Invite'}
                      </Button>
                    </section>
                  )
                })}
              </section>
            ) : (
              <section>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                />
                {emailAlreadySent && (
                  <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded mt-2">Invite already sent to this email</p>
                )}
                {sentEmails.size > 0 && (
                  <p className="text-xs text-[#9A8070] mt-2">
                    Sent: {Array.from(sentEmails).slice(0, 3).join(', ')}
                    {sentEmails.size > 3 ? ` +${sentEmails.size - 3} more` : ''}
                  </p>
                )}
                <Button
                  className="w-full mt-3"
                  onClick={sendEmailInvite}
                  disabled={emailSending || emailAlreadySent || !emailNorm}
                >
                  {emailSending ? 'Sending...' : emailAlreadySent ? 'Already sent' : 'Send invite'}
                </Button>
              </section>
            )}
            <Button variant="outline" className="w-full mt-4" onClick={() => setInviteOpen(false)}>
              Close
            </Button>
          </section>
        </section>
      )}

      {taskOpen && (
        <section className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4 z-50 pb-nav-safe sm:pb-4">
          <form onSubmit={saveTask} className="bg-white rounded-xl p-6 w-full max-w-md space-y-3">
            <Input label="Title" value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} required />
            <textarea
              className="w-full border rounded p-2 text-sm"
              placeholder="Description"
              value={taskForm.description}
              onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
            />
            <Input label="Deadline" type="date" value={taskForm.deadline} onChange={(e) => setTaskForm((p) => ({ ...p, deadline: e.target.value }))} required />
            <select
              className="w-full border rounded p-2 text-sm"
              value={taskForm.assignedTo}
              onChange={(e) => setTaskForm((p) => ({ ...p, assignedTo: e.target.value }))}
            >
              <option value="">Everyone</option>
              {group.members?.map((m) => (
                <option key={m.id} value={m.id}>{m.displayName}</option>
              ))}
            </select>
            <section className="flex gap-2">
              <Button variant="outline" type="button" className="flex-1" onClick={() => setTaskOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1">Create</Button>
            </section>
          </form>
        </section>
      )}
    </PageContent>
  )
}
