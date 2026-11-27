import { Navigate, Route, Routes } from 'react-router-dom'
import LandingScreen from '../features/onboarding/LandingScreen'
import GameScreen from '../features/challenges/GameScreen'
import CloudGameScreen from '../features/challenges/CloudGameScreen'
import PersonaRevealScreen from '../features/store-picks/PersonaRevealScreen'
import StorePicksScreen from '../features/store-picks/StorePicksScreen'
import ValueScreen from '../features/value-compare/ValueScreen'
import NextStepScreen from '../features/handoff/NextStepScreen'
import AppShell from './AppShell'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<LandingScreen />} />
        <Route path="/setup" element={<GameScreen />} />
        <Route path="/play" element={<CloudGameScreen />} />
        <Route path="/persona" element={<PersonaRevealScreen />} />
        <Route path="/store" element={<StorePicksScreen />} />
        <Route path="/value" element={<ValueScreen />} />
        <Route path="/next-step" element={<NextStepScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
