interface Props {
  onSwitchToReplyQueue: () => void
}

export function CommsStudioContent({ onSwitchToReplyQueue }: Props) {
  return (
    <div className="db-studio-content">
      <div className="db-studio-welcome">
        <div className="db-studio-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <h2 className="db-studio-welcome-title">communication studio</h2>
        <p className="db-studio-welcome-desc">
          describe what you want to say, and cadence will draft a voice-matched email.
          or switch to reply queue to let an agent read your inbox and draft replies.
        </p>

        <div className="db-comms-modes">
          <div className="db-comms-mode db-comms-mode--active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span>compose new</span>
          </div>
          <button className="db-comms-mode" onClick={onSwitchToReplyQueue}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
              <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
            </svg>
            <span>reply queue</span>
          </button>
        </div>

        <div className="db-studio-welcome-steps">
          <div className="db-welcome-step">
            <span className="db-welcome-step-num">1</span>
            <span>describe what you want to say</span>
          </div>
          <div className="db-welcome-step">
            <span className="db-welcome-step-num">2</span>
            <span>cadence drafts a voice-matched email</span>
          </div>
          <div className="db-welcome-step">
            <span className="db-welcome-step-num">3</span>
            <span>copy, edit, or regenerate</span>
          </div>
        </div>
      </div>
    </div>
  )
}
