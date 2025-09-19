import React, { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

type IntervalSpec = { name: string; minutes: number; seconds: number }
type Stage = 'editing' | 'running' | 'paused' | 'done'

function toMs(m: number, s: number) { return Math.max(0, (m|0)*60000 + (s|0)*1000) }
function fmtMMSS(ms: number) {
  const t = Math.max(0, Math.floor(ms))
  const s = Math.floor(t / 1000)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
}

export default function IntervalsPage() {
  const [stage, setStage] = useState<Stage>('editing')
  const [items, setItems] = useState<IntervalSpec[]>([
    { name: 'Warm-up', minutes: 1, seconds: 0 },
    { name: 'Work', minutes: 0, seconds: 30 },
    { name: 'Rest', minutes: 0, seconds: 15 },
  ])

  const [idx, setIdx] = useState(0)
  const idxRef = useRef(0)            // <- índice vivo para RAF
  const [remaining, setRemaining] = useState(0)

  const runningRef = useRef(false)
  const t0Ref = useRef<number | null>(null)
  const remRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  const ensureAudio = async () => {
    try {
      const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext
      const ctx = new Ctx()
      if (ctx.state === 'suspended') await ctx.resume()
      return ctx
    } catch { return null }
  }
  const beep = async () => {
    try {
      const ctx: any = await ensureAudio()
      if (!ctx) return
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = 880
      g.gain.value = 0.001
      o.connect(g).connect(ctx.destination)
      o.start()
      g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15)
      o.stop(ctx.currentTime + 0.16)
    } catch {}
    if (navigator.vibrate) navigator.vibrate(100)
  }

  const startFrom = async (startIndex: number) => {
    if (items.length === 0) return
    const dur = toMs(items[startIndex].minutes, items[startIndex].seconds)
    setIdx(startIndex)
    idxRef.current = startIndex
    setRemaining(dur)
    remRef.current = dur
    t0Ref.current = performance.now()
    runningRef.current = true
    setStage('running')
    rafRef.current = requestAnimationFrame(tick)
    await ensureAudio()
  }

  const tick = () => {
    if (!runningRef.current || t0Ref.current == null) return
    const now = performance.now()
    const delta = now - t0Ref.current
    const next = remRef.current - delta

    if (next <= 0) {
      void beep()
      const nextIdx = idxRef.current + 1
      if (nextIdx >= items.length) {
        setIdx(items.length - 1)
        idxRef.current = items.length - 1
        setRemaining(0)
        runningRef.current = false
        setStage('done')
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        return
      } else {
        const durNext = toMs(items[nextIdx].minutes, items[nextIdx].seconds)
        setIdx(nextIdx)
        idxRef.current = nextIdx
        setRemaining(durNext)
        remRef.current = durNext
        t0Ref.current = performance.now()
        rafRef.current = requestAnimationFrame(tick)
        return
      }
    } else {
      setRemaining(next)
      rafRef.current = requestAnimationFrame(tick)
    }
  }

  const pause = () => {
    if (!runningRef.current) return
    runningRef.current = false
    if (t0Ref.current != null) remRef.current = remaining
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setStage('paused')
  }

  const resume = () => {
    if (stage !== 'paused') return
    runningRef.current = true
    t0Ref.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)
    setStage('running')
  }

  const reset = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    runningRef.current = false
    t0Ref.current = null
    remRef.current = 0
    setIdx(0)
    idxRef.current = 0
    setRemaining(0)
    setStage('editing')
  }

  const totalMs = items.reduce((acc, it) => acc + toMs(it.minutes, it.seconds), 0)
  let doneBeforeMs = 0
  for (let i = 0; i < idx; i++) doneBeforeMs += toMs(items[i].minutes, items[i].seconds)
  const currentDur = idx < items.length ? toMs(items[idx].minutes, items[idx].seconds) : 0
  const currentPct = currentDur > 0 ? Math.min(100, Math.max(0, Math.round(((currentDur - remaining) / currentDur) * 100))) : 0
  const overallPct = totalMs > 0 ? Math.min(100, Math.round(((doneBeforeMs + (currentDur - remaining)) / totalMs) * 100)) : 0
  const nextLabel = idx + 1 < items.length ? items[idx + 1].name : '—'

  return (
    <div style={{fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial', padding:16, maxWidth:720, margin:'0 auto'}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <h1 style={{margin:0}}>Timer de intervalos</h1>
        <Link to="/"><button>Home</button></Link>
      </div>

      {stage === 'editing' && (
        <div style={{display:'grid', gap:12}}>
          {items.map((it, i) => (
            <div key={i} style={{display:'grid', gridTemplateColumns:'1fr 90px 90px 90px', gap:8, alignItems:'center'}}>
              <input
                type="text"
                value={it.name}
                onChange={e => setItems(prev => prev.map((p, j) => j===i ? {...p, name:e.target.value} : p))}
                placeholder={`Interval ${i+1}`}
                style={{padding:'6px 8px'}}
              />
              <input
                type="number" min={0} max={59}
                value={it.minutes}
                onChange={e => setItems(prev => prev.map((p, j) => j===i ? {...p, minutes:Number(e.target.value||0)} : p))}
                style={{padding:'6px 8px'}}
              />
              <input
                type="number" min={0} max={59}
                value={it.seconds}
                onChange={e => setItems(prev => prev.map((p, j) => j===i ? {...p, seconds:Number(e.target.value||0)} : p))}
                style={{padding:'6px 8px'}}
              />
              <button onClick={() => setItems(prev => prev.filter((_, j) => j!==i))}>Eliminar</button>
            </div>
          ))}

          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <button onClick={() => setItems(prev => [...prev, { name:`Interval ${prev.length+1}`, minutes:0, seconds:30 }])}>
              + Agregar intervalo
            </button>
            <button onClick={() => { if (items.length>0) void startFrom(0) }} style={{padding:'10px 14px', fontSize:16}}>
              Iniciar
            </button>
          </div>

          <div style={{color:'#555'}}>Total programado: <b>{fmtMMSS(totalMs)}</b></div>
        </div>
      )}

      {stage !== 'editing' && (
        <>
          <div style={{marginTop:8}}>
            <div style={{fontSize:14, color:'#555'}}>Intervalo actual</div>
            <div style={{fontSize:22, fontWeight:600}}>{items[idx]?.name ?? '—'}</div>
            <div style={{fontSize:48, fontVariantNumeric:'tabular-nums', marginTop:4}}>
              {fmtMMSS(remaining)}
            </div>

            <div style={{height:10, background:'#e5e7eb', borderRadius:6, overflow:'hidden', marginTop:8}}>
              <div style={{height:'100%', width:`${currentPct}%`, background:'#2563eb'}}/>
            </div>

            <div style={{marginTop:8, color:'#555'}}>Siguiente: <b>{nextLabel}</b></div>

            <div style={{marginTop:8, height:10, background:'#eee', borderRadius:6, overflow:'hidden'}}>
              <div style={{height:'100%', width:`${overallPct}%`, background:'#10b981'}}/>
            </div>

            <div style={{display:'flex', gap:12, flexWrap:'wrap', marginTop:12}}>
              {stage === 'running' ? (
                <button onClick={pause}>Pause</button>
              ) : stage === 'paused' ? (
                <button onClick={resume}>Resume</button>
              ) : (
                <button disabled>Finalizado</button>
              )}
              <button onClick={reset}>Reset</button>
              {stage !== 'running' && stage !== 'done' && (
                <button onClick={() => void startFrom(idxRef.current)}>Reiniciar este intervalo</button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
