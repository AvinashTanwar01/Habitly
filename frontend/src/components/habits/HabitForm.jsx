import { useState, useEffect } from 'react'
import EmojiPicker from 'emoji-picker-react'
import Button from '../ui/Button'
import Input from '../ui/Input'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const COLORS = ['#8C6E52', '#C4A882', '#6B5344', '#9A8070', '#4A7C59', '#7C4A6B', '#4A6B7C']

const defaults = {
  name: '',
  type: 'yesno',
  target: 1,
  scheduleType: 'daily',
  scheduleDays: [],
  reminderTime: '09:00',
  icon: '🌱',
  color: '#8C6E52',
}

export default function HabitForm({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(defaults)
  const [error, setError] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...defaults, ...initial, scheduleDays: initial.scheduleDays || [] } : defaults)
      setError('')
      setShowEmojiPicker(false)
    }
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save')
    }
  }

  return (
    <section
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 pb-nav-safe sm:pb-4"
      onClick={onClose}
      role="presentation"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-md max-h-[min(92dvh,calc(100dvh-1rem))] sm:max-h-[90vh] flex flex-col"
      >
        <header className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
          <h2 className="font-semibold">{initial?._id ? 'Edit habit' : 'New habit'}</h2>
          <button type="button" onClick={onClose} className="text-[#9A8070]">✕</button>
        </header>
        <section className="p-4 overflow-y-auto space-y-4 flex-1">
          {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
          <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          <section>
            <p className="text-xs text-[#9A8070] mb-2">Type</p>
            <section className="grid grid-cols-3 gap-2">
              {[
                { k: 'time', l: '⏱ Time' },
                { k: 'count', l: '🔢 Count' },
                { k: 'yesno', l: '✅ Yes/No' },
              ].map(({ k, l }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set('type', k)}
                  className={`py-2 rounded-lg text-sm border ${form.type === k ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'border-[rgba(100,80,60,0.12)]'}`}
                >
                  {l}
                </button>
              ))}
            </section>
          </section>
          {form.type === 'time' && (
            <section className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-[#9A8070] mb-2 font-medium">Hours</p>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-full border border-[rgba(100,80,60,0.2)] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#8C6E52] transition-colors"
                  value={Math.floor((form.target || 0) / 60) || ''}
                  onChange={(e) => {
                    const hrs = Math.max(0, parseInt(e.target.value, 10) || 0)
                    const mins = (form.target || 0) % 60
                    set('target', hrs * 60 + mins)
                  }}
                />
              </div>
              <div>
                <p className="text-xs text-[#9A8070] mb-2 font-medium">Minutes</p>
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  className="w-full border border-[rgba(100,80,60,0.2)] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#8C6E52] transition-colors"
                  value={(form.target || 0) % 60 || ''}
                  onChange={(e) => {
                    const mins = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0))
                    const hrs = Math.floor((form.target || 0) / 60)
                    set('target', hrs * 60 + mins)
                  }}
                />
              </div>
            </section>
          )}
          {form.type === 'count' && (
            <Input
              label="Target Count"
              type="number"
              value={form.target}
              onChange={(e) => set('target', Math.max(1, Number(e.target.value) || 1))}
            />
          )}
          <section>
            <p className="text-xs text-[#9A8070] mb-2">Schedule</p>
            <section className="grid grid-cols-2 gap-2">
              {['daily', 'weekdays', 'weekends', 'custom'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('scheduleType', s)}
                  className={`py-2 rounded-lg text-sm capitalize border ${form.scheduleType === s ? 'bg-[#1C1917] text-white' : ''}`}
                >
                  {s}
                </button>
              ))}
            </section>
          </section>
          {form.scheduleType === 'custom' && (
            <section className="flex gap-2 flex-wrap">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    const days = form.scheduleDays.includes(d)
                      ? form.scheduleDays.filter((x) => x !== d)
                      : [...form.scheduleDays, d]
                    set('scheduleDays', days)
                  }}
                  className={`w-9 h-9 rounded-full text-xs ${form.scheduleDays.includes(d) ? 'bg-[#1C1917] text-white' : 'bg-[#EDE5DB]'}`}
                >
                  {d[0]}
                </button>
              ))}
            </section>
          )}
          <section className="grid grid-cols-2 gap-3 items-end">
            <Input label="Reminder" type="time" value={form.reminderTime} onChange={(e) => set('reminderTime', e.target.value)} />
            <div>
              <p className="text-xs text-[#9A8070] mb-2">Icon</p>
              <button
                type="button"
                onClick={() => setShowEmojiPicker((open) => !open)}
                className={`w-12 h-12 text-2xl rounded-xl border flex items-center justify-center transition-colors ${
                  showEmojiPicker
                    ? 'border-[#8C6E52] bg-[#F2EDE6] ring-2 ring-[#C4A882]/40'
                    : 'border-[rgba(100,80,60,0.2)] bg-[#F2EDE6] hover:border-[#8C6E52]'
                }`}
                aria-expanded={showEmojiPicker}
                aria-label="Choose habit icon"
              >
                {form.icon || '🌱'}
              </button>
            </div>
          </section>
          {showEmojiPicker && (
            <section className="rounded-xl border border-[rgba(100,80,60,0.15)] shadow-lg overflow-hidden bg-white -mt-1">
              <header className="flex items-center justify-between px-3 py-2 border-b bg-[#FAF8F5] text-xs text-[#8C6E52]">
                <span>Pick an icon</span>
                <button
                  type="button"
                  className="text-[#9A8070] hover:text-[#1C1917] px-2 py-0.5 rounded"
                  onClick={() => setShowEmojiPicker(false)}
                >
                  Done
                </button>
              </header>
              <div className="[&_.EmojiPickerReact]:!w-full [&_.EmojiPickerReact]:!max-w-full">
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    setForm((prev) => ({ ...prev, icon: emojiData.emoji }))
                  }}
                  theme="light"
                  searchPlaceholder="Search emoji..."
                  width="100%"
                  height={320}
                  lazyLoadEmojis
                  previewConfig={{ showPreview: false }}
                />
              </div>
            </section>
          )}
          <section className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set('color', c)}
                className={`w-8 h-8 rounded-full border-2 ${form.color === c ? 'border-[#1C1917]' : 'border-transparent'}`}
                style={{ background: c }}
              />
            ))}
          </section>
        </section>
        <footer className="p-4 border-t flex gap-2 sticky bottom-0 bg-white">
          <Button variant="outline" className="flex-1" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" className="flex-1">{initial?._id ? 'Save' : 'Create'}</Button>
        </footer>
      </form>
    </section>
  )
}
