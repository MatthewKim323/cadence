import { useState, useCallback } from 'react'
import { useAuth } from './context/AuthContext'
import { Loader } from './components/Loader'
import { AuthModal } from './components/AuthModal'
import { Onboarding } from './components/Onboarding'
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

function LandingPage() {
  return (
    <>
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
    </>
  )
}

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const handleLoaded = useCallback(() => setLoaded(true), [])
  const { user, loading, onboardingComplete } = useAuth()

  const showOnboarding = !loading && user && onboardingComplete === false

  return (
    <>
      {!loaded && <Loader onComplete={handleLoaded} />}
      <AuthModal />
      {showOnboarding && <Onboarding />}
      <div className={`noise-overlay ${loaded ? 'app-enter' : 'app-hidden'}`}>
        <LandingPage />
      </div>
    </>
  )
}
