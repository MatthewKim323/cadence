import { useNavigate } from 'react-router-dom'
import { useInView } from '../hooks/useInView'
import { useAuth } from '../context/AuthContext'

export function CTA() {
  const { ref, isInView } = useInView()
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
    <section className="cta-section" ref={ref as React.RefObject<HTMLElement>}>
      <div className={`reveal ${isInView ? 'in-view' : ''}`}>
        <h2 className="cta-headline">
          Your cadence is yours.<br />
          <span className="accent">We just preserve it.</span>
        </h2>
        <p className="cta-sub">
          AI should empower expression, not flatten it. Cadence teaches you
          what makes your voice yours — and helps you use it better.
        </p>
      </div>
      <div className={`reveal ${isInView ? 'in-view' : ''} reveal-delay-2`}>
        <button className="btn-primary" onClick={handleGetStarted}>
          get started
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </section>
  )
}
