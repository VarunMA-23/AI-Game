import { useEffect, useRef } from 'react'
import { createGame, destroyGame } from '../../game/createGame'

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }
    createGame(containerRef.current)
    return () => destroyGame()
  }, [])

  return (
    <div
      className="game-canvas"
      ref={containerRef}
      role="application"
      aria-label="Routing race game"
    />
  )
}
