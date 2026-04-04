import { useInView } from '../hooks/useInView'

export function AgentTerminal() {
  const { ref, isInView } = useInView()

  return (
    <section className="section" ref={ref as React.RefObject<HTMLElement>}>
      <div className="section-inner">
        <div className={`reveal ${isInView ? 'in-view' : ''}`}>
          <p className="section-eyebrow">multi-agent pipeline</p>
          <h2 className="section-title">
            Watch it work.<br />
            <span className="accent">In real time.</span>
          </h2>
          <p className="section-desc">
            Four specialized agents coordinate live — Voice Analyst,
            Writer, Detector Squad, and Quality Scorer. Each step visible,
            each agent auditable.
          </p>
        </div>

        <div className={`terminal reveal ${isInView ? 'in-view' : ''} reveal-delay-2`}>
          <div className="terminal-header">
            <div className="terminal-dots">
              <span className="terminal-dot terminal-dot--red" />
              <span className="terminal-dot terminal-dot--yellow" />
              <span className="terminal-dot terminal-dot--green" />
            </div>
            <span className="terminal-title">cadence — writing studio pipeline</span>
          </div>
          <div className="terminal-body">
            {isInView && (
              <>
                <div className="term-line term-line--1">
                  <span className="term-prompt">▸</span>
                  <span className="term-cmd">agent 1 → voice analyst</span>
                  <span className="term-status term-status--ok">fingerprint ready</span>
                </div>
                <div className="term-line term-line--2 term-line--indent">
                  <span className="term-tree">└──</span>
                  <span className="term-cmd term-cmd--dim">directness: 0.82 · humor: 0.35 · em-dashes: heavy</span>
                </div>
                <div className="term-line term-line--3">
                  <span className="term-prompt">▸</span>
                  <span className="term-cmd">agent 2 → writer (streaming)</span>
                  <span className="term-progress">
                    <span className="term-progress-bar" />
                  </span>
                </div>
                <div className="term-line term-line--4">
                  <span className="term-prompt">▸</span>
                  <span className="term-cmd">agent 3 → detector squad (3 parallel browsers)</span>
                </div>
                <div className="term-line term-line--5 term-line--indent">
                  <span className="term-tree">├──</span>
                  <span className="term-detector">gptzero</span>
                  <span className="term-score">4.2%</span>
                  <span className="term-check">✓</span>
                </div>
                <div className="term-line term-line--6 term-line--indent">
                  <span className="term-tree">├──</span>
                  <span className="term-detector">zerogpt</span>
                  <span className="term-score">3.1%</span>
                  <span className="term-check">✓</span>
                </div>
                <div className="term-line term-line--7 term-line--indent">
                  <span className="term-tree">└──</span>
                  <span className="term-detector">originality</span>
                  <span className="term-score">5.8%</span>
                  <span className="term-check">✓</span>
                </div>
                <div className="term-line term-line--8">
                  <span className="term-prompt">▸</span>
                  <span className="term-cmd">quality scorer → voice match</span>
                  <span className="term-status term-status--ok">93%</span>
                </div>
                <div className="term-line term-line--9">
                  <span className="term-prompt">▸</span>
                  <span className="term-cmd term-cmd--success">all agents complete. draft passed.</span>
                </div>
                <div className="term-line term-line--10">
                  <span className="term-cursor" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
