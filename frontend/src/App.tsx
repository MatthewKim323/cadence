import { useState, useCallback } from 'react'
import { Loader } from './components/Loader'
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

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const handleLoaded = useCallback(() => setLoaded(true), [])

  return (
    <>
      {!loaded && <Loader onComplete={handleLoaded} />}
      <div className={`noise-overlay ${loaded ? 'app-enter' : 'app-hidden'}`}>
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
      </div>
    </>
  )
}
