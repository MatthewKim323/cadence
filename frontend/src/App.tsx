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
  return (
    <div className="noise-overlay">
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
  )
}
