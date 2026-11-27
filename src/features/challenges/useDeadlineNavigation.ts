import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export const useDeadlineNavigation = (
  startedAt: number | null,
  deadlineMs: number,
  path: string,
): void => {
  const navigate = useNavigate()

  useEffect(() => {
    if (!startedAt) {
      return
    }
    const remainingMs = startedAt + deadlineMs - Date.now()
    if (remainingMs <= 0) {
      navigate(path, { replace: true })
      return
    }
    const timer = window.setTimeout(() => navigate(path, { replace: true }), remainingMs)
    return () => window.clearTimeout(timer)
  }, [navigate, path, startedAt, deadlineMs])
}
