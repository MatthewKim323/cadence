import { useInView } from '../hooks/useInView'

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    title: 'Glass Box Transparency',
    desc: 'Watch the entire process live — agent thinking, draft streaming, parallel browsers scanning. Every decision visible.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M12 2a3 3 0 00-3 3v4a3 3 0 006 0V5a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <path d="M12 19v3" />
      </svg>
    ),
    title: 'Voice Fingerprinting',
    desc: 'Cadence maps your sentence cadence, lexical variance, tonal balance, and argumentative rhythm into a unique stylistic identity.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Multi-Detector Consensus',
    desc: 'Three AI detectors scan in parallel — GPTZero, ZeroGPT, Originality.ai — cross-referenced for reliable scoring.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    title: 'Sentence-Level Scraping',
    desc: 'Browser agents scrape exactly which sentences each detector flagged, enabling surgical revision instead of blind rewriting.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    title: 'Communication Matching',
    desc: 'Platform-aware, recipient-aware voice matching. Knows you write differently to your CEO than your teammate.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M12 2a3 3 0 00-3 3v4a3 3 0 006 0V5a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <path d="M12 19v3" />
        <path d="M8 22h8" />
      </svg>
    ),
    title: 'Voice Interview',
    desc: 'No writing samples? A 5-minute ElevenLabs conversation builds your voice profile from scratch.',
  },
]

export function Features() {
  const { ref, isInView } = useInView()

  return (
    <section id="features" className="section" ref={ref as React.RefObject<HTMLElement>}>
      <div className="section-inner">
        <div className={`reveal ${isInView ? 'in-view' : ''}`}>
          <p className="section-eyebrow">capabilities</p>
          <h2 className="section-title">
            Built <span className="accent">different.</span>
          </h2>
        </div>

        <div className="features-grid">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`feature-card reveal ${isInView ? 'in-view' : ''}`}
              style={{ transitionDelay: `${0.15 + i * 0.08}s` }}
            >
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
