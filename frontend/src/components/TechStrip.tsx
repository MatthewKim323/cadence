import { useInView } from '../hooks/useInView'

const techs = [
  { name: 'Anthropic Claude', label: 'LLM Engine' },
  { name: 'Browser Use', label: 'Detection' },
  { name: 'ElevenLabs', label: 'Voice Interview' },
  { name: 'React + Vite', label: 'Frontend' },
  { name: 'FastAPI', label: 'Backend' },
  { name: 'Supabase', label: 'Auth & DB' },
]

export function TechStrip() {
  const { ref, isInView } = useInView()

  return (
    <section className="section tech-strip-section" ref={ref as React.RefObject<HTMLElement>}>
      <div className="section-inner">
        <div className={`reveal ${isInView ? 'in-view' : ''}`}>
          <p className="section-eyebrow">tech stack</p>
          <h2 className="section-title">
            Powered by the <span className="accent">best.</span>
          </h2>
        </div>
        <div className="tech-grid">
          {techs.map((t, i) => (
            <div
              key={t.name}
              className={`tech-item reveal ${isInView ? 'in-view' : ''}`}
              style={{ transitionDelay: `${0.2 + i * 0.08}s` }}
            >
              <span className="tech-name">{t.name}</span>
              <span className="tech-label">{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
