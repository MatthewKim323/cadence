import { useInView } from '../hooks/useInView'

const steps = [
  {
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
    label: 'Voice Analyst',
    sub: 'Fingerprints your style',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
    label: 'Writer',
    sub: 'Streams your draft live',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    label: '3 Detectors',
    sub: 'Browser Use agents in parallel',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    label: 'Consensus',
    sub: 'Cross-reference flagged sentences',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
    ),
    label: 'Pass',
    sub: 'Revision loop until ≤10%',
  },
]

export function Pipeline() {
  const { ref, isInView } = useInView()

  return (
    <section id="pipeline" className="section" ref={ref as React.RefObject<HTMLElement>}>
      <div className="section-inner">
        <div className={`reveal ${isInView ? 'in-view' : ''}`}>
          <p className="section-eyebrow">the detection loop</p>
          <h2 className="section-title">
            Write. Detect.<br />
            <span className="accent">Revise. Repeat.</span>
          </h2>
          <p className="section-desc">
            Three Browser Use agents navigate real AI detector websites in
            parallel, scrape per-sentence flagging, compute consensus, and
            loop back to the Writer until your draft passes.
          </p>
        </div>

        <div className="pipeline-steps">
          {steps.map((step, i) => (
            <div
              key={step.label}
              className={`pipeline-step reveal ${isInView ? 'in-view' : ''}`}
              style={{ transitionDelay: `${0.2 + i * 0.1}s` }}
            >
              <div className="pipeline-icon">{step.icon}</div>
              <p className="pipeline-label">{step.label}</p>
              <p className="pipeline-sublabel">{step.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
