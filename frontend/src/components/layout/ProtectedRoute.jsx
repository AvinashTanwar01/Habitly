import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) {
    return <span className="min-h-screen flex items-center justify-center text-[#9A8070] block w-full">Loading...</span>
  }
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
