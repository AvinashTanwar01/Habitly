import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { groupService } from '../services/groupService'
import { taskService } from '../services/taskService'
import PageContent from '../components/layout/PageContent'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function GroupTaskNew() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [form, setForm] = useState({ title: '', description: '', deadline: '', assignedTo: '' })

  useEffect(() => {
    groupService.getOne(id).then((g) => setMembers(g.members || []))
  }, [id])

  const submit = async (e) => {
    e.preventDefault()
    await taskService.create(id, { ...form, assignedTo: form.assignedTo || null })
    navigate(`/groups/${id}/leader`)
  }

  return (
    <PageContent className="flex justify-center">
      <form onSubmit={submit} className="bg-white border rounded-xl p-5 sm:p-8 w-full max-w-md space-y-4">
        <button type="button" onClick={() => navigate(-1)} className="text-sm text-[#8C6E52]">← Back</button>
        <h1 className="text-xl font-semibold">Add task</h1>
        <Input label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
        <textarea className="w-full border rounded p-2 text-sm" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        <Input label="Deadline" type="date" value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))} required />
        <select className="w-full border rounded p-2 text-sm" value={form.assignedTo} onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))}>
          <option value="">Everyone</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
        </select>
        <Button type="submit" className="w-full">Create task</Button>
      </form>
    </PageContent>
  )
}
