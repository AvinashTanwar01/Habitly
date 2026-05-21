import { useState, useEffect } from 'react'
import { habitService } from '../services/habitService'

export function useHabits() {
  const [habits, setHabits]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  useEffect(() => {
    habitService.getAll().then(setHabits).catch(setError).finally(() => setLoading(false))
  }, [])
  return { habits, loading, error, setHabits }
}
