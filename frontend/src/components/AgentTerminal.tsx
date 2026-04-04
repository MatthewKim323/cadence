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
            Eleven agents coordinate live — Claude for intelligence,
            Browser Use for web interaction. Each step visible,
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
                  <span className="term-cmd">profile digester → parsing writing.cadence</span>
                  <span className="term-status term-status--ok">done</span>
                </div>
                <div className="term-line term-line--2 term-line--indent">
                  <span className="term-tree">└──</span>
                  <span className="term-cmd term-cmd--dim">directness: 0.82 · humor: 0.35 · em-dashes: heavy</span>
                </div>
                <div className="term-line term-line--3">
                  <span className="term-prompt">▸</span>
                  <span className="term-cmd">long-form writer → streaming draft</span>
                  <span className="term-progress">
                    <span className="term-progress-bar" />
                  </span>
                </div>
                <div className="term-line term-line--4">
                  <span className="term-prompt">▸</span>
                  <span className="term-cmd">detection loop → 3 browser use agents (parallel)</span>
                </div>
                <div className="term-line term-line--5 term-line--indent">
                  <span className="term-tree">├──</span>
                  <span className="term-detector">gptzero agent</span>
                  <span className="term-score">48%</span>
                  <span className="term-cmd term-cmd--dim">5 flagged</span>
                </div>
                <div className="term-line term-line--6 term-line--indent">
                  <span className="term-tree">├──</span>
                  <span className="term-detector">zerogpt agent</span>
                  <span className="term-score">52%</span>
                  <span className="term-cmd term-cmd--dim">4 flagged</span>
                </div>
                <div className="term-line term-line--7 term-line--indent">
                  <span className="term-tree">└──</span>
                  <span className="term-detector">originality agent</span>
                  <span className="term-score">44%</span>
                  <span className="term-cmd term-cmd--dim">6 flagged</span>
                </div>
                <div className="term-line term-line--8">
                  <span className="term-prompt">▸</span>
                  <span className="term-cmd">consensus: 3 sentences flagged by all 3 → revising</span>
                </div>
                <div className="term-line term-line--9">
                  <span className="term-prompt">▸</span>
                  <span className="term-cmd">re-detection → gptzero 8% · zerogpt 6% · originality 9%</span>
                </div>
                <div className="term-line term-line--10">
                  <span className="term-prompt">▸</span>
                  <span className="term-cmd term-cmd--success">consensus avg 7.7% — passed. draft complete.</span>
                </div>
                <div className="term-line term-line--11">
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
