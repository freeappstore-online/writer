import { useState, useEffect } from 'react'
import writingConfig from './writing-config.json'

/**
 * Writer — FreeAppStore app powered by @freeagentstore/writing-assistant
 *
 * This is NOT a generic LLM wrapper. It uses a trained config that captures
 * a specific writing style (tone rules, formatting patterns, custom rules).
 * The config was evolved from 50 example texts in the FreeAgentStore Console.
 *
 * The LLM generates text, but the CONFIG constrains it to be consistent
 * with the trained style every time.
 */

type Mode = 'write' | 'rewrite' | 'improve'
type ContentType = 'email' | 'blog' | 'social' | 'reply'

function buildPrompt(mode: Mode, contentType: ContentType, input: string): string {
  const cfg = writingConfig
  const parts: string[] = [cfg.systemPrompt]

  // Tone rules
  if (cfg.toneRules.length > 0) {
    parts.push('\nTone:')
    for (const r of cfg.toneRules) parts.push(`- ${r.aspect}: ${r.description} (${r.value}/10)`)
  }

  // Formatting
  const f = cfg.formatting
  if (f.greeting && contentType === 'email') parts.push(`\nStart with: "${f.greeting}"`)
  if (f.signOff && contentType === 'email') parts.push(`End with: "${f.signOff}"`)
  if (f.maxParagraphs) parts.push(`Max ${f.maxParagraphs} paragraphs.`)
  if (f.avgSentenceLength) {
    const len: Record<string, string> = { short: '10-15 words', medium: '15-25 words', long: '25-35 words' }
    parts.push(`Sentences: ${len[f.avgSentenceLength]}.`)
  }
  if (f.useBulletPoints) parts.push('Use bullet points for lists.')
  if (f.includeSubjectLine && contentType === 'email') parts.push('Include Subject: line first.')
  if (f.customRules?.length) {
    parts.push('\nRules:')
    for (const rule of f.customRules) parts.push(`- ${rule}`)
  }

  // Mode-specific instructions
  const modePrompts: Record<Mode, string> = {
    write: `Write a ${contentType}. User describes what they want:`,
    rewrite: `Rewrite this ${contentType} in the style described above. Keep the meaning, change the voice:`,
    improve: `Improve this ${contentType}. Fix grammar, clarity, and tone to match the style above:`,
  }
  parts.push(`\n${modePrompts[mode]}`)
  parts.push(input)

  return parts.join('\n')
}

export default function App() {
  const [mode, setMode] = useState<Mode>('write')
  const [contentType, setContentType] = useState<ContentType>('email')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [gen, setGen] = useState(false)
  const [source, setSource] = useState('')
  const [ai, setAi] = useState<boolean | null>(null)

  useEffect(() => {
    (async () => {
      const g = globalThis as any
      const LM = g.LanguageModel ?? g.ai?.languageModel
      if (LM?.availability) {
        const s = await LM.availability()
        setAi(s === 'available' || s === 'readily')
      } else setAi(false)
    })()
  }, [])

  async function generate() {
    if (!input.trim()) return
    setGen(true); setOutput('')
    const prompt = buildPrompt(mode, contentType, input)

    try {
      const g = globalThis as any
      const LM = g.LanguageModel ?? g.ai?.languageModel
      if (LM?.create) {
        const s = await LM.create({ systemPrompt: writingConfig.systemPrompt })
        setOutput(await s.prompt(prompt)); s.destroy?.()
        setSource('Chrome Built-in AI'); setGen(false); return
      }
    } catch {}
    try {
      const r = await fetch('http://localhost:11434/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3.2', prompt, stream: false }),
      })
      if (r.ok) { setOutput((await r.json()).response); setSource('Ollama'); setGen(false); return }
    } catch {}
    setOutput('No AI available.\n\nEnable Chrome Built-in AI:\n  chrome://flags → "Prompt API for Gemini Nano"\n\nOr: ollama pull llama3.2')
    setSource(''); setGen(false)
  }

  const modeLabels: Record<Mode, string> = { write: 'Write', rewrite: 'Rewrite', improve: 'Improve' }
  const typeLabels: Record<ContentType, string> = { email: 'Email', blog: 'Blog Post', social: 'Social Post', reply: 'Reply' }

  return (
    <div style={{ fontFamily: "'Manrope',system-ui,sans-serif", minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#fafafa' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #262626' }}>
        <a href="https://freeappstore.online" style={{ color: '#a3a3a3', fontSize: 13, textDecoration: 'none' }}>FreeAppStore</a>
        <strong style={{ fontSize: 18 }}>Writer</strong>
        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#1e1b4b', color: '#a78bfa' }}>
          {writingConfig.styleName} style · {writingConfig.consistency}% consistent
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 999, background: ai ? 'rgba(5,150,105,0.2)' : '#262626', color: ai ? '#34d399' : '#a3a3a3' }}>
          {ai === null ? '...' : ai ? 'AI Ready' : 'No AI'}
        </span>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 680, width: '100%', margin: '0 auto', padding: 16, gap: 12 }}>
        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(Object.entries(modeLabels) as [Mode, string][]).map(([k, v]) => (
            <button key={k} onClick={() => setMode(k)}
              style={{ padding: '6px 14px', borderRadius: 999, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: mode === k ? '#7c3aed' : '#262626', color: mode === k ? '#fff' : '#a3a3a3' }}>
              {v}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {/* Content type */}
          {(Object.entries(typeLabels) as [ContentType, string][]).map(([k, v]) => (
            <button key={k} onClick={() => setContentType(k)}
              style={{ padding: '6px 12px', borderRadius: 999, border: contentType === k ? '1px solid #7c3aed' : '1px solid #262626', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: 'transparent', color: contentType === k ? '#a78bfa' : '#737373' }}>
              {v}
            </button>
          ))}
        </div>

        {/* Input */}
        <textarea value={input} onChange={e => setInput(e.target.value)}
          placeholder={mode === 'write' ? `Describe the ${contentType} you want written...` : `Paste ${contentType} text to ${mode}...`}
          style={{ minHeight: 130, padding: 14, borderRadius: 12, background: '#171717', border: '1px solid #262626', color: '#fafafa', fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit' }} />

        <button onClick={generate} disabled={!input.trim() || gen}
          style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: (!input.trim() || gen) ? 0.4 : 1 }}>
          {gen ? `${modeLabels[mode]}ing...` : `${modeLabels[mode]} ${typeLabels[contentType]}`}
        </button>

        {/* Style info bar */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {writingConfig.toneRules.map((r, i) => (
            <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#1a1a2e', color: '#a3a3a3' }}>
              {r.aspect}: {r.value}/10
            </span>
          ))}
          {writingConfig.formatting.customRules?.slice(0, 2).map((r, i) => (
            <span key={`r${i}`} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#1a1a2e', color: '#737373' }}>
              {r.slice(0, 40)}...
            </span>
          ))}
        </div>

        {/* Output */}
        {output && (
          <div style={{ padding: 16, borderRadius: 12, background: '#171717', border: '1px solid #262626', fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11, color: '#737373' }}>
              <span>{source && <>via {source} · </>}Powered by <a href="https://freeagentstore.online/agents/writing-assistant/" style={{ color: '#a78bfa' }}>Writing Assistant</a> · {writingConfig.styleName} config</span>
              <button onClick={() => navigator.clipboard.writeText(output)} style={{ background: '#262626', border: 'none', color: '#a3a3a3', padding: '2px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Copy</button>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{output}</div>
          </div>
        )}
      </main>

      <footer style={{ textAlign: 'center', fontSize: 11, color: '#525252', padding: 12, borderTop: '1px solid #262626' }}>
        <a href="https://freeappstore.online" style={{ color: '#737373' }}>FreeAppStore</a> app · powered by <a href="https://freeagentstore.online/agents/writing-assistant/" style={{ color: '#737373' }}>Writing Assistant</a> agent with trained "{writingConfig.styleName}" config · <a href="https://freeagentstore.online/console/" style={{ color: '#737373' }}>Train your own</a>
      </footer>
    </div>
  )
}
