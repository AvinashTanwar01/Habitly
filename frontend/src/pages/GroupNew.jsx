import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { groupService } from '../services/groupService'
import { useToast } from '../context/ToastContext'
import PageContent from '../components/layout/PageContent'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const MIN_NAME = 3
const MAX_NAME = 50

const RULES = [
  { icon: '👥', text: 'Up to 15 members per group' },
  { icon: '📅', text: 'You can create 3 groups per calendar month' },
  { icon: '✏️', text: `Group name: ${MIN_NAME}–${MAX_NAME} characters` },
  { icon: '👑', text: 'You become the group leader and can invite members, add tasks, and post notes' },
  { icon: '🔗', text: 'Share invite links or add members by display name or email' },
]

export default function GroupNew() {
  const [name, setName] = useState('')
  const [usage, setUsage] = useState({ used: 0, limit: 3, remaining: 3 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    groupService.getUsage().then(setUsage).catch(() => {})
  }, [])

  const trimmed = name.trim()
  const nameValid = trimmed.length >= MIN_NAME && trimmed.length <= MAX_NAME
  const canCreate = usage.remaining > 0 && nameValid && !loading

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!nameValid) {
      setError(`Name must be between ${MIN_NAME} and ${MAX_NAME} characters`)
      return
    }
    if (usage.remaining <= 0) {
      setError('You have used all 3 group creations for this month')
      return
    }
    try {
      setLoading(true)
      const group = await groupService.create({ name: trimmed })
      toast.success(`Group "${trimmed}" created`)
      navigate(`/groups/${group._id}/leader`)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create group'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContent className="flex justify-center">
      <section className="w-full max-w-lg">
        <h1 className="text-2xl font-semibold mb-2">Create group</h1>
        <p className="text-sm text-[#9A8070] mb-6">
          {usage.remaining} of {usage.limit} group creations left this month
        </p>

        <article className="bg-[#F2EDE6] border border-[rgba(100,80,60,0.12)] rounded-xl p-4 mb-6">
          <h2 className="text-sm font-medium text-[#1C1917] mb-3">Group rules</h2>
          <ul className="space-y-2 text-sm text-[#5a4a3a]">
            {RULES.map((r) => (
              <li key={r.text} className="flex gap-2">
                <span>{r.icon}</span>
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </article>

        <form onSubmit={submit} className="bg-white border rounded-xl p-6 space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
          <div>
            <Input
              label="Group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning Crew"
              required
              maxLength={MAX_NAME}
            />
            <p className={`text-xs mt-1 ${nameValid || !trimmed ? 'text-[#9A8070]' : 'text-red-600'}`}>
              {trimmed.length}/{MAX_NAME} characters
              {trimmed.length > 0 && trimmed.length < MIN_NAME && ` (minimum ${MIN_NAME})`}
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={!canCreate}>
            {loading ? 'Please wait...' : 'Create group'}
          </Button>
          {usage.remaining <= 0 && (
            <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded">
              Monthly limit reached. You can create another group next month.
            </p>
          )}
        </form>
      </section>
    </PageContent>
  )
}
