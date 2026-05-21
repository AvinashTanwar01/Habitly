/** Normalize "9:00", "09:00:00" → "09:00" for scheduler matching */
function normalizeReminderTime(value) {
  if (value == null || value === '') return '09:00'
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})/)
  if (!m) return '09:00'
  const h = Math.min(23, Math.max(0, Number(m[1])))
  const min = Math.min(59, Math.max(0, Number(m[2])))
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

module.exports = { normalizeReminderTime, nowHHMM }
