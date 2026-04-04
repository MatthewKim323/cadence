const items = [
  'voice fingerprinting',
  'live dashboard',
  'ai detection loop',
  '7 agents on agentverse',
  'browser automation',
  'quality scorer',
  'writing studio',
  'communication studio',
  'voice interviews',
  'two orchestrators',
  'writing.cadence',
  'comms.cadence',
  'revision loop',
]

export function Marquee() {
  const doubled = [...items, ...items]

  return (
    <div className="marquee-section">
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span className="marquee-item" key={i}>
            <span className="dot" />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
