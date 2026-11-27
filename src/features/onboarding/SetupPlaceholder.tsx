import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Cpu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'

export default function SetupPlaceholder() {
  const navigate = useNavigate()
  const resetSession = useGameStore((state) => state.resetSession)
  const reduceMotionPreference = useReducedMotion()
  const reduceMotion = reduceMotionPreference ?? false

  const handleBack = () => {
    resetSession()
    navigate('/')
  }

  return (
    <motion.main
      className="setup-stub"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.45 }}
    >
      <section className="setup-card" aria-labelledby="setup-title">
        <p className="setup-kicker">Foundation ready</p>
        <h1 id="setup-title" className="setup-title">
          Race setup is next.
        </h1>
        <p className="setup-copy">
          The two-lane race and challenge packet routing are not part of this
          phase yet. Start here returns you to the landing screen.
        </p>
        <button type="button" className="secondary-button" onClick={handleBack}>
          <ArrowLeft size={20} aria-hidden="true" />
          Back to landing
          <Cpu size={20} aria-hidden="true" />
        </button>
      </section>
    </motion.main>
  )
}
