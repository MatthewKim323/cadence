import jsPDF from 'jspdf'

const MARGIN = 20
const PAGE_W = 210
const CONTENT_W = PAGE_W - MARGIN * 2
const LINE_H = 6
const SECTION_GAP = 10

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxW: number, fontSize: number): number {
  doc.setFontSize(fontSize)
  const lines = doc.splitTextToSize(text, maxW) as string[]
  for (const line of lines) {
    if (y > 275) {
      doc.addPage()
      y = MARGIN
    }
    doc.text(line, x, y)
    y += LINE_H * (fontSize / 10)
  }
  return y
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  if (y > 260) { doc.addPage(); y = MARGIN }
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text(title.toUpperCase(), MARGIN, y)
  y += 2
  doc.setDrawColor(180, 180, 180)
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
  y += LINE_H
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50, 50, 50)
  return y
}

function kvRow(doc: jsPDF, key: string, value: string, y: number): number {
  if (y > 275) { doc.addPage(); y = MARGIN }
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(key, MARGIN + 4, y)
  doc.setFont('helvetica', 'normal')
  const valX = MARGIN + 52
  y = addWrappedText(doc, value, valX, y, CONTENT_W - 56, 9)
  return y + 1
}

function bulletList(doc: jsPDF, items: string[], y: number): number {
  doc.setFontSize(9)
  for (const item of items) {
    if (y > 275) { doc.addPage(); y = MARGIN }
    doc.text('•', MARGIN + 4, y)
    y = addWrappedText(doc, item, MARGIN + 10, y, CONTENT_W - 14, 9)
    y += 1
  }
  return y
}

function header(doc: jsPDF, title: string, subtitle: string, name: string): number {
  doc.setFillColor(24, 24, 28)
  doc.rect(0, 0, PAGE_W, 42, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(title, MARGIN, 18)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 180)
  doc.text(subtitle, MARGIN, 27)

  doc.setFontSize(9)
  doc.setTextColor(140, 140, 140)
  doc.text(`${name}  •  ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, MARGIN, 36)

  doc.setTextColor(50, 50, 50)
  return 52
}

export function exportWritingPdf(profile: Record<string, unknown>, name: string) {
  const doc = new jsPDF()
  let y = header(doc, 'CADENCE', 'Writing Voice Profile', name)

  const p = (profile.profile ?? profile) as Record<string, unknown>
  const metrics = (p.metrics ?? {}) as Record<string, unknown>
  const rules = (p.writing_rules ?? []) as string[]
  const phrases = (p.signature_phrases ?? []) as string[]
  const avoided = (p.avoided_patterns ?? []) as string[]
  const exemplars = (p.exemplar_passages ?? []) as string[]

  y = sectionTitle(doc, 'Metrics', y)
  for (const [k, v] of Object.entries(metrics)) {
    y = kvRow(doc, k.replace(/_/g, ' '), String(v), y)
  }
  y += SECTION_GAP

  if (rules.length) {
    y = sectionTitle(doc, 'Writing Rules', y)
    y = bulletList(doc, rules, y)
    y += SECTION_GAP
  }

  if (phrases.length) {
    y = sectionTitle(doc, 'Signature Phrases', y)
    y = bulletList(doc, phrases.map(p => `"${p}"`), y)
    y += SECTION_GAP
  }

  if (avoided.length) {
    y = sectionTitle(doc, 'Avoided Patterns', y)
    y = bulletList(doc, avoided, y)
    y += SECTION_GAP
  }

  if (exemplars.length) {
    y = sectionTitle(doc, 'Exemplar Passages', y)
    for (const ex of exemplars) {
      y = addWrappedText(doc, `"${ex}"`, MARGIN + 4, y, CONTENT_W - 8, 9)
      y += 4
    }
  }

  doc.save('writing.cadence.pdf')
}

export function exportCommsPdf(profile: Record<string, unknown>, name: string) {
  const doc = new jsPDF()
  let y = header(doc, 'CADENCE', 'Communication Voice Profile', name)

  const p = (profile.profile ?? profile) as Record<string, unknown>
  const emailStyle = (p.email_style ?? {}) as Record<string, unknown>
  const responsePatterns = (p.response_patterns ?? {}) as Record<string, unknown>
  const rules = (p.writing_rules ?? []) as string[]

  y = sectionTitle(doc, 'Email Style', y)
  for (const [k, v] of Object.entries(emailStyle)) {
    const display = typeof v === 'object' ? JSON.stringify(v) : String(v)
    y = kvRow(doc, k.replace(/_/g, ' '), display, y)
  }
  y += SECTION_GAP

  y = sectionTitle(doc, 'Response Patterns', y)
  for (const [k, v] of Object.entries(responsePatterns)) {
    const display = Array.isArray(v) ? v.join(', ') : String(v)
    y = kvRow(doc, k.replace(/_/g, ' '), display, y)
  }
  y += SECTION_GAP

  if (rules.length) {
    y = sectionTitle(doc, 'Communication Rules', y)
    y = bulletList(doc, rules, y)
  }

  doc.save('comms.cadence.pdf')
}

export function exportInterviewPdf(
  fingerprint: Record<string, unknown>,
  transcript: string,
  name: string,
) {
  const doc = new jsPDF()
  let y = header(doc, 'CADENCE', 'Interview Voice Profile', name)

  const personality = (fingerprint.personality ?? {}) as Record<string, unknown>
  const speech = (fingerprint.speech_patterns ?? {}) as Record<string, unknown>
  const reasoning = (fingerprint.reasoning_style ?? {}) as Record<string, unknown>
  const vocab = (fingerprint.vocabulary ?? {}) as Record<string, unknown>
  const rules = (fingerprint.voice_rules ?? []) as string[]
  const quotes = (fingerprint.exemplar_quotes ?? []) as string[]

  if (Object.keys(personality).length) {
    y = sectionTitle(doc, 'Personality', y)
    for (const [k, v] of Object.entries(personality)) {
      y = kvRow(doc, k.replace(/_/g, ' '), String(v), y)
    }
    y += SECTION_GAP
  }

  if (Object.keys(speech).length) {
    y = sectionTitle(doc, 'Speech Patterns', y)
    for (const [k, v] of Object.entries(speech)) {
      const display = Array.isArray(v) ? v.join(', ') : String(v)
      y = kvRow(doc, k.replace(/_/g, ' '), display, y)
    }
    y += SECTION_GAP
  }

  if (Object.keys(reasoning).length) {
    y = sectionTitle(doc, 'Reasoning Style', y)
    for (const [k, v] of Object.entries(reasoning)) {
      const display = Array.isArray(v) ? v.join(', ') : String(v)
      y = kvRow(doc, k.replace(/_/g, ' '), display, y)
    }
    y += SECTION_GAP
  }

  if (Object.keys(vocab).length) {
    y = sectionTitle(doc, 'Vocabulary', y)
    for (const [k, v] of Object.entries(vocab)) {
      const display = Array.isArray(v) ? v.join(', ') : String(v)
      y = kvRow(doc, k.replace(/_/g, ' '), display, y)
    }
    y += SECTION_GAP
  }

  if (rules.length) {
    y = sectionTitle(doc, 'Voice Rules', y)
    y = bulletList(doc, rules, y)
    y += SECTION_GAP
  }

  if (quotes.length) {
    y = sectionTitle(doc, 'Exemplar Quotes', y)
    for (const q of quotes) {
      y = addWrappedText(doc, `"${q}"`, MARGIN + 4, y, CONTENT_W - 8, 9)
      y += 4
    }
    y += SECTION_GAP
  }

  if (transcript) {
    y = sectionTitle(doc, 'Transcript', y)
    const lines = transcript.split(/\n\n/).filter(Boolean)
    doc.setFontSize(8)
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('Cadence: ')) {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        y = addWrappedText(doc, 'CADENCE', MARGIN + 4, y, CONTENT_W - 8, 7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(50, 50, 50)
        y = addWrappedText(doc, trimmed.slice(9), MARGIN + 4, y, CONTENT_W - 8, 8)
      } else if (trimmed.startsWith('You: ')) {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 30, 30)
        y = addWrappedText(doc, 'YOU', MARGIN + 4, y, CONTENT_W - 8, 7)
        doc.setFont('helvetica', 'normal')
        y = addWrappedText(doc, trimmed.slice(4), MARGIN + 4, y, CONTENT_W - 8, 8)
      }
      y += 3
    }
  }

  doc.save('interview.cadence.pdf')
}
