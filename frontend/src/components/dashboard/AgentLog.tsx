import { useEffect, useRef } from 'react'

export interface LogEntry {
  agent: string
  text: string
  timestamp: number
}

const AGENT_COLORS: Record<string, string> = {
  'voice_analyst': '#a78bfa',
  'writer': '#60a5fa',
  'detector:copyleaks': '#fb923c',
  'detector:zerogpt': '#facc15',
  'detector:originality': '#f472b6',
  'consensus': '#4ade80',
  'system': '#94a3b8',
}

const AGENT_LABELS: Record<string, string> = {
  'voice_analyst': 'voice analyst',
  'writer': 'writer',
  'detector:copyleaks': 'copyleaks',
  'detector:zerogpt': 'zerogpt',
  'detector:originality': 'originality',
  'consensus': 'consensus',
  'system': 'system',
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

interface Props {
  entries: LogEntry[]
}

export function AgentLog({ entries }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries])

  return (
    <div className="db-agent-log">
      <div className="db-agent-log-label">agent communication</div>
      <div className="db-agent-log-scroll" ref={scrollRef}>
        {entries.length === 0 && (
          <div className="db-agent-log-empty">waiting for pipeline to start...</div>
        )}
        {entries.map((entry, i) => {
          const color = AGENT_COLORS[entry.agent] || '#94a3b8'
          const label = AGENT_LABELS[entry.agent] || entry.agent
          const isSystemDivider = entry.agent === 'system' && entry.text.startsWith('---')

          return (
            <div
              key={i}
              className={`db-agent-log-entry ${isSystemDivider ? 'db-agent-log-divider' : ''}`}
            >
              <span className="db-agent-log-time">{formatTime(entry.timestamp)}</span>
              <span className="db-agent-log-arrow" style={{ color }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h8M8 5l3 3-3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="db-agent-log-agent" style={{ color }}>
                [{label}]
              </span>
              <span className="db-agent-log-text">{entry.text}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
