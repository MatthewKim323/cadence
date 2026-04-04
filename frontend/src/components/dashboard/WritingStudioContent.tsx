export function WritingStudioContent() {
  return (
    <div className="db-studio-content">
      <div className="db-studio-welcome">
        <div className="db-studio-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z"/>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
            <path d="M2 2l7.586 7.586"/>
            <circle cx="11" cy="11" r="2"/>
          </svg>
        </div>
        <h2 className="db-studio-welcome-title">writing studio</h2>
        <p className="db-studio-welcome-desc">
          select source documents from your library, describe what you want to write,
          and watch the pipeline work — voice profiling, drafting, detection, and revision,
          all in real time.
        </p>
        <div className="db-studio-welcome-steps">
          <div className="db-welcome-step">
            <span className="db-welcome-step-num">1</span>
            <span>click [+] to select source documents</span>
          </div>
          <div className="db-welcome-step">
            <span className="db-welcome-step-num">2</span>
            <span>describe what you want to write</span>
          </div>
          <div className="db-welcome-step">
            <span className="db-welcome-step-num">3</span>
            <span>watch the live dashboard</span>
          </div>
        </div>
      </div>
    </div>
  )
}
