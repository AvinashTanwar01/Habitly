import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { groupService } from '../services/groupService'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Button from '../components/ui/Button'

export default function Invite() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [preview, setPreview] = useState(null)
  const [already, setAlready] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError('')
    groupService
      .getInvitePreview(code)
      .then((p) => setPreview(p))
      .catch(() => setError('Invalid or expired invite code'))
      .finally(() => setLoading(false))
  }, [code])

  const join = async () => {
    if (!user) {
      navigate(`/login?redirect=/invite/${code}`)
      return
    }
    try {
      setError('')
      const r = await groupService.join(code)
      if (r.alreadyMember) {
        setAlready(true)
        toast.info("You're already in this group")
        return
      }
      toast.success(`Joined ${preview?.groupName || preview?.name || 'the group'}`)
      navigate(`/groups/${r.group._id}`)
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not join'
      setError(msg)
    }
  }

  if (loading) return <p className="text-center py-24 text-[#9A8070]">Loading...</p>
  if (error && !preview) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-[#FAF8F5] p-4">
        <p className="text-center text-red-600 max-w-md">{error}</p>
      </section>
    )
  }
  if (!preview) return null

  const name = preview.groupName || preview.name
  const isFull = (preview.memberCount ?? 0) >= 15
  const fullMessage = isFull ? 'This group is full' : error && /full/i.test(error) ? error : null

  return (
    <section className="min-h-dvh flex items-center justify-center bg-[#FAF8F5] p-4 overflow-x-hidden">
      <article className="bg-white border rounded-xl p-6 sm:p-8 max-w-md w-full text-center shadow-sm">
        <h1 className="text-xl font-semibold mb-2">{name}</h1>
        <p className="text-sm text-[#9A8070] mb-6">
          Led by {preview.leaderName} · {preview.memberCount} members
        </p>
        {error && !fullMessage && <p className="mb-4 p-2 bg-red-50 text-red-700 text-sm rounded-lg">{error}</p>}
        {fullMessage && <p className="mb-4 p-2 bg-amber-50 text-amber-900 text-sm rounded-lg">{fullMessage}</p>}
        {already ? (
          <p className="text-[#8C6E52] mb-4">You&apos;re already in this group.</p>
        ) : !user ? (
          <>
            <p className="text-sm text-[#9A8070] mb-4">Sign in to accept this invite.</p>
            <Link to={`/login?redirect=/invite/${code}`}>
              <Button className="w-full mb-3">Sign in to join</Button>
            </Link>
          </>
        ) : (
          <Button className="w-full mb-3" onClick={join} disabled={!!fullMessage}>
            Join group
          </Button>
        )}
        <Link to="/" className="text-sm text-[#9A8070]">
          Back to home
        </Link>
      </article>
    </section>
  )
}
