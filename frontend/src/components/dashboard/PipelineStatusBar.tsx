interface Props {
  steps: string[]
  currentIndex: number
}

export function PipelineStatusBar({ steps, currentIndex }: Props) {
  return (
    <div className="db-pipeline-bar">
      {steps.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <div key={step} className="db-pipeline-step-wrap">
            <div className={`db-pipeline-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
              {done ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : active ? (
                <span className="db-pipeline-dot" />
              ) : (
                <span className="db-pipeline-circle" />
              )}
              <span>{step}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`db-pipeline-connector ${done ? 'done' : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
