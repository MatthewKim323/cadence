import { useState, useCallback } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './context/AuthContext'
import { Loader } from './components/Loader'
import { AuthModal } from './components/AuthModal'
import { Onboarding } from './components/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { EclipticaBackground } from './components/EclipticaBackground'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { Marquee } from './components/Marquee'
import { Studios } from './components/Studios'
import { AgentTerminal } from './components/AgentTerminal'
import { Pipeline } from './components/Pipeline'
import { FetchAI } from './components/FetchAI'
import { TechStrip } from './components/TechStrip'
import { CTA } from './components/CTA'
import { Footer } from './components/Footer'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } },
}

function LandingPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <EclipticaBackground />
      <Navbar />
      <Hero />
      <Marquee />
      <Studios />
      <AgentTerminal />
      <Pipeline />
      <FetchAI />
      <TechStrip />
      <CTA />
      <Footer />
    </motion.div>
  )
}

function DashboardRoute() {
  const { user, loading, onboardingComplete } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/" replace />

  const showOnboarding = onboardingComplete === false

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ height: '100%' }}
    >
      {showOnboarding && <Onboarding />}
      <Dashboard />
    </motion.div>
  )
}

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const handleLoaded = useCallback(() => setLoaded(true), [])
  const location = useLocation()

  return (
    <>
      {!loaded && <Loader onComplete={handleLoaded} />}
      <AuthModal />
      <div className={`noise-overlay ${loaded ? 'app-enter' : 'app-hidden'}`}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardRoute />} />
          </Routes>
        </AnimatePresence>
      </div>
    </>
  )
}
