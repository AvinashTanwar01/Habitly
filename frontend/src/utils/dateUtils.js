export const today       = () => new Date().toISOString().split('T')[0]
export const formatDate  = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
export const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000)
