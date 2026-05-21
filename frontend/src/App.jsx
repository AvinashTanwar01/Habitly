import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Navbar from './components/layout/Navbar'
import AppHeader from './components/layout/AppHeader'
import ToastContainer from './components/ui/ToastContainer'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Habits from './pages/Habits'
import HabitDetail from './pages/HabitDetail'
import Stats from './pages/Stats'
import Leaderboard from './pages/Leaderboard'
import Settings from './pages/Settings'
import Groups from './pages/Groups'
import GroupNew from './pages/GroupNew'
import GroupMember from './pages/GroupMember'
import GroupLeader from './pages/GroupLeader'
import GroupTaskNew from './pages/GroupTaskNew'
import Invite from './pages/Invite'
import { useHabitReminders } from './hooks/useHabitReminders'

function AppLayout() {
  useHabitReminders()
  return (
    <section className="flex h-screen bg-[#FAF8F5]">
      <Navbar />
      <section className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </main>
      </section>
    </section>
  )
}

export default function App() {
  return (
    <ToastProvider>
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ToastContainer />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/invite/:code" element={<Invite />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/habits" element={<Habits />} />
              <Route path="/habits/:id" element={<HabitDetail />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/groups/new" element={<GroupNew />} />
              <Route path="/groups/:id" element={<GroupMember />} />
              <Route path="/groups/:id/leader" element={<GroupLeader />} />
              <Route path="/groups/:id/tasks/new" element={<GroupTaskNew />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ToastProvider>
  )
}
