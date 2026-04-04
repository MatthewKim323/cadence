import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Hero() {
  const { user, openAuthModal } = useAuth()
  const navigate = useNavigate()

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard')
    } else {
      openAuthModal()
    }
  }

  return (
    <section className="hero">
      <div className="hero-content">
        <p className="hero-eyebrow">multi-agent voice preservation</p>
        <h1 className="hero-headline">
          Your voice,<br />
          <span className="accent">preserved.</span>
        </h1>
        <p className="hero-sub">
          Cadence is a multi-agent AI platform that preserves your writing
          voice — your rhythm, your word choices, the things that make your
          writing <em>yours</em>.
        </p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={handleGetStarted}>
            get started
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <a href="#studios" className="btn-secondary">see how it works</a>
        </div>
      </div>
      <div className="hero-gradient" />
      <div className="hero-scroll">
        <span>Scroll</span>
        <div className="scroll-line" />
      </div>
    </section>
  )
}
