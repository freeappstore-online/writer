import { useState, useEffect } from 'react'

type Mode = 'email' | 'blog' | 'social' | 'reply'

const TEMPLATES: Record<Mode, { label: string; placeholder: string; prompt: string }> = {
  email: { label: 'Email', placeholder: 'e.g. "Polite follow-up to a job application"', prompt: 'Write a professional email. Be concise. Include subject line.' },
  blog: { label: 'Blog Post', placeholder: 'e.g. "Benefits of remote work"', prompt: 'Write an engaging blog post with headers and short paragraphs.' },
  social: { label: 'Social Post', placeholder: 'e.g. "Launching our new product"', prompt: 'Write a concise social media post with a call to action.' },
  reply: { label: 'Reply', placeholder: 'Paste the message to reply to...', prompt: 'Write a thoughtful, professional reply.' },
}

export default function App() {
  const [mode, setMode] = useState<Mode>('email')
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
    const p = `${TEMPLATES[mode].prompt}\n\n${input}`
    try {
      const g = globalThis as any
      const LM = g.LanguageModel ?? g.ai?.languageModel
      if (LM?.create) {
        const s = await LM.create({ systemPrompt: TEMPLATES[mode].prompt })
        setOutput(await s.prompt(input)); s.destroy?.()
        setSource('Chrome Built-in AI'); setGen(false); return
      }
    } catch {}
    try {
      const r = await fetch('http://localhost:11434/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3.2', prompt: p, stream: false }),
      })
      if (r.ok) { setOutput((await r.json()).response); setSource('Ollama'); setGen(false); return }
    } catch {}
    setOutput('No AI available.\n\nEnable Chrome Built-in AI:\n  chrome://flags → "Prompt API for Gemini Nano" → Enabled\n\nOr install Ollama:\n  https://ollama.ai → ollama pull llama3.2')
    setSource(''); setGen(false)
  }

  return (
    <div style={{ fontFamily: "'Manrope',system-ui,sans-serif", minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#fafafa' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #262626' }}>
        <a href="https://freeappstore.online" style={{ color: '#a3a3a3', fontSize: 13, textDecoration: 'none' }}>FreeAppStore</a>
        <strong style={{ fontSize: 18 }}>Writer</strong>
        <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 999, background: ai ? 'rgba(5,150,105,0.2)' : '#262626', color: ai ? '#34d399' : '#a3a3a3' }}>
          {ai === null ? 'Checking...' : ai ? 'AI Ready' : 'No AI'}
        </span>
      </header>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 640, width: '100%', margin: '0 auto', padding: 16, gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(Object.entries(TEMPLATES) as [Mode, any][]).map(([k, v]) => (
            <button key={k} onClick={() => { setMode(k); setOutput('') }}
              style={{ padding: '6px 16px', borderRadius: 999, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: mode === k ? '#7c3aed' : '#262626', color: mode === k ? '#fff' : '#a3a3a3' }}>
              {v.label}
            </button>
          ))}
        </div>
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={TEMPLATES[mode].placeholder}
          style={{ minHeight: 120, padding: 16, borderRadius: 12, background: '#171717', border: '1px solid #262626', color: '#fafafa', fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit' }} />
        <button onClick={generate} disabled={!input.trim() || gen}
          style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: (!input.trim() || gen) ? 0.4 : 1 }}>
          {gen ? 'Writing...' : `Write ${TEMPLATES[mode].label}`}
        </button>
        {output && (
          <div style={{ padding: 16, borderRadius: 12, background: '#171717', border: '1px solid #262626', fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11, color: '#737373' }}>
              <span>{source && <>via {source} · </>}Powered by <a href="https://freeagentstore.online/agents/writing-assistant/" style={{ color: '#a78bfa' }}>Writing Assistant</a> agent</span>
              <button onClick={() => navigator.clipboard.writeText(output)} style={{ background: '#262626', border: 'none', color: '#a3a3a3', padding: '2px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Copy</button>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{output}</div>
          </div>
        )}
      </main>
      <footer style={{ textAlign: 'center', fontSize: 11, color: '#525252', padding: 12, borderTop: '1px solid #262626' }}>
        A <a href="https://freeappstore.online" style={{ color: '#737373' }}>FreeAppStore</a> app, powered by the{' '}
        <a href="https://freeagentstore.online/agents/writing-assistant/" style={{ color: '#737373' }}>Writing Assistant</a> agent. 100% private.
      </footer>
    </div>
  )
}
