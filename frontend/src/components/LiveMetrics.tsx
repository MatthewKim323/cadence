import { useInView } from '../hooks/useInView'
import { useEffect, useState, useRef } from 'react'

function AnimatedNumber({ end, suffix = '', prefix = '', duration = 2000, delay = 0, active }: {
  end: number
  suffix?: string
  prefix?: string
  duration?: number
  delay?: number
  active: boolean
}) {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!active) { setCurrent(0); return }

    const timeout = setTimeout(() => {
      const start = performance.now()
      const animate = (now: number) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setCurrent(Math.round(eased * end * 10) / 10)
        if (progress < 1) rafRef.current = requestAnimationFrame(animate)
      }
      rafRef.current = requestAnimationFrame(animate)
    }, delay)

    return () => {
      clearTimeout(timeout)
      cancelAnimationFrame(rafRef.current)
    }
  }, [active, end, duration, delay])

  const display = Number.isInteger(end) ? Math.round(current) : current.toFixed(1)

  return (
    <span className="metric-number">
      {prefix}{display}{suffix}
    </span>
  )
}

const metrics = [
  { end: 7.2, prefix: '<', suffix: '%', label: 'avg detection score', sublabel: 'across all detectors' },
  { end: 3, prefix: '', suffix: '', label: 'parallel browsers', sublabel: 'scanning simultaneously' },
  { end: 94, prefix: '', suffix: '%', label: 'voice match accuracy', sublabel: 'fingerprint fidelity' },
  { end: 5, prefix: '<', suffix: 'min', label: 'voice interview', sublabel: 'to build your profile' },
]

export function LiveMetrics() {
  const { ref, isInView } = useInView()

  return (
    <section className="section metrics-section" ref={ref as React.RefObject<HTMLElement>}>
      <div className="section-inner">
        <div className={`reveal ${isInView ? 'in-view' : ''}`}>
          <p className="section-eyebrow">performance</p>
          <h2 className="section-title">
            Numbers that<br />
            <span className="accent">speak.</span>
          </h2>
        </div>

        <div className="metrics-grid">
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className={`metric-card reveal ${isInView ? 'in-view' : ''}`}
              style={{ transitionDelay: `${0.2 + i * 0.1}s` }}
            >
              <AnimatedNumber
                end={m.end}
                prefix={m.prefix}
                suffix={m.suffix}
                delay={200 + i * 150}
                active={isInView}
              />
              <span className="metric-label">{m.label}</span>
              <span className="metric-sublabel">{m.sublabel}</span>
              <div className="metric-pulse" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
