// TODO: Fetch today's habits from API and render them
// This talks to the same backend API as the website
const API = 'http://localhost:5000/api'

async function loadHabits() {
  const token = await getToken()
  if (!token) { showLogin(); return }
  const res   = await fetch(`${API}/habits/today`, { headers: { Authorization: `Bearer ${token}` } })
  const habits = await res.json()
  renderHabits(habits)
}

function getToken() {
  return new Promise(resolve => chrome.storage.local.get('token', d => resolve(d.token)))
}

function renderHabits(habits) {
  // TODO: render habit list in popup
  document.getElementById('root').innerHTML = `<p>${habits.length} habits today</p>`
}

function showLogin() {
  document.getElementById('root').innerHTML = '<p>Please log in on the website first.</p>'
}

loadHabits()
