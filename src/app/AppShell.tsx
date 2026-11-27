import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import StaffScreen from '../features/staff-panel/StaffScreen'
import { listHandoffs } from '../services/storage/handoffStorage'

export default function AppShell() {
  const [staffOpen, setStaffOpen] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    listHandoffs()
  }, [])

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current)
      }
    }
  }, [])

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  const startLongPress = () => {
    clearTimer()
    timer.current = window.setTimeout(() => {
      setStaffOpen(true)
      timer.current = null
    }, 3000)
  }

  return (
    <div className="app-shell">
      <button
        type="button"
        className="staff-trigger"
        aria-label="Open staff panel"
        onPointerDown={startLongPress}
        onPointerUp={clearTimer}
        onPointerLeave={clearTimer}
        onPointerCancel={clearTimer}
      />
      <div className="app-grid">
        <Outlet />
      </div>
      {staffOpen ? (
        <div className="staff-overlay" role="dialog" aria-modal="true" aria-label="Staff panel">
          <StaffScreen onClose={() => setStaffOpen(false)} />
        </div>
      ) : null}
    </div>
  )
}
