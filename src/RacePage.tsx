import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

type Stage = 'setup' | 'ready' | 'running' | 'done'

function fmt(ms: number) {
  const t = Math.max(0, Math.floor(ms))
  const s = Math.floor(t / 1000)
  const m = Math.floor(s / 60)
  const ss = s % 60
  const ms3 = t % 1000
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}.${String(ms3).padStart(3,'0')}`
}

export default function RacePage() {
  const [stage, setStage] = useState<Stage>('setup')
  const [count, setCount] = useState<number>(5)
  const [names, setNames] = useState<string[]>(() =>
    Array.from({ length: 5 }, (_, i) => `P${i + 1}`)
  )

  const [running, setRunning] = useState(false)   // solo para render
  const runningRef = useRef(false)                // fuente de verdad para RAF
  const [elapsed, setElapsed] = useState(0)
  const [finishes, setFinishes] = useState<number[]>([])
  const [finishNames, setFinishNames] = useState<string[]>([])

  const t0Ref = useRef<number | null>(null)
  const accRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setNames(prev => {
      const arr = prev.slice(0, count)
      while (arr.length < count) arr.push(`P${arr.length + 1}`)
      return arr
    })
  }, [count])

  const tick = () => {
    if (!runningRef.current || t0Ref.current == null) return
    const now = performance.now()
    const delta = now - t0Ref.current
    setElapsed(accRef.current + delta)
    rafRef.current = requestAnimationFrame(tick)
  }

  const confirmRace = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    t0Ref.current = null
    accRef.current = 0
    setElapsed(0)
    setFinishes([])
    setFinishNames([])
    runningRef.current = false
    setRunning(false)
    setStage('ready')
  }

  const start = () => {
    if (runningRef.current) return
    t0Ref.current = performance.now()
    runningRef.current = true
    setRunning(true)
    setStage('running')
    rafRef.current = requestAnimationFrame(tick)
  }

  const stop = () => {
    if (!runningRef.current) return
    if (t0Ref.current != null) accRef.current += performance.now() - t0Ref.current
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    t0Ref.current = null
    runningRef.current = false
    setRunning(false)
  }

  const reset = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    t0Ref.current = null
    accRef.current = 0
    setElapsed(0)
    setFinishes([])
    setFinishNames([])
    runningRef.current = false
    setRunning(false)
    setStage('setup')
  }

  const markNext = () => {
    if (!runningRef.current || stage !== 'running') return
    const now = performance.now()
    const totalNow = accRef.current + (t0Ref.current ? (now - t0Ref.current) : 0)
    const idx = finishes.length
    const label = names[idx] ?? `P${idx + 1}`
    setFinishes(prev => [...prev, totalNow])
    setFinishNames(prev => [...prev, label])
    if (idx + 1 >= count) {
      stop()
      setStage('done')
    }
  }

  const firstTime = finishes[0] ?? null
  const tableRows = useMemo(() => {
    return finishes.map((t, i) => {
      const gap = firstTime == null ? 0 : t - firstTime
      return (
        <tr key={i}>
          <td>{i + 1}</td>
          <td>{finishNames[i] ?? `P${i + 1}`}</td>
          <td>{fmt(t)}</td>
          <td>{i === 0 ? '—' : `+${fmt(gap)}`}</td>
        </tr>
      )
    })
  }, [finishes, finishNames, firstTime])

  return (
    <div style={{fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial', padding:16, maxWidth:720, margin:'0 auto'}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <h1 style={{margin:0}}>Carrera multi-competidor</h1>
        <Link to="/"><button>Home</button></Link>
      </div>

      {stage === 'setup' && (
        <div style={{display:'grid', gap:12}}>
          <label>
            Cantidad de competidores:&nbsp;
            <input
              type="number" min={1} max={200}
              value={count}
              onChange={e => setCount(Math.max(1, Math.min(200, Number(e.target.value || 1))))}
              style={{width:100}}
            />
          </label>

          <div style={{display:'grid', gap:8}}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} style={{display:'flex', alignItems:'center', gap:8}}>
                <div style={{width:80, opacity:.7}}>Pos {i+1}</div>
                <input
                  type="text"
                  value={names[i] ?? `P${i+1}`}
                  onChange={e => {
                    const v = e.target.value
                    setNames(prev => {
                      const arr = [...prev]
                      arr[i] = v
                      return arr
                    })
                  }}
                  placeholder={`P${i+1}`}
                  style={{flex:1, padding:'6px 8px'}}
                />
              </div>
            ))}
          </div>

          <button onClick={confirmRace} style={{padding:'10px 14px', fontSize:16}}>
            Confirmar carrera
          </button>
        </div>
      )}

      {stage === 'ready' && (
        <div style={{display:'grid', gap:12}}>
          <div style={{fontSize:14, color:'#555'}}>Competidores listos: {count}</div>
          <div style={{fontSize:40, fontVariantNumeric:'tabular-nums'}}>{fmt(0)}</div>
          <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
            <button onClick={start} style={{padding:'10px 14px', fontSize:16}}>Start</button>
            <button onClick={reset}>Volver a editar</button>
          </div>
          <div style={{color:'#555'}}>Siguiente en llegar: <b>{names[finishes.length] ?? `P${finishes.length + 1}`}</b></div>
        </div>
      )}

      {(stage === 'running' || stage === 'done') && (
        <>
          <div style={{marginTop:8, fontSize:40, fontVariantNumeric:'tabular-nums'}}>
            {fmt(elapsed)}
          </div>

          <div style={{display:'flex', gap:12, flexWrap:'wrap', marginTop:8}}>
            {running
              ? <button onClick={stop}>Stop</button>
              : (stage !== 'done' ? <button onClick={start}>Start</button> : <button disabled>Finalizado</button>)
            }
            <button onClick={reset}>Reset</button>
            {running && finishes.length < count && (
              <button
                onClick={markNext}
                style={{padding:'12px 18px', fontSize:18, fontWeight:600}}
              >
                Next Position
              </button>
            )}
          </div>

          <p style={{marginTop:8, color:'#555'}}>
            Llegadas registradas: <b>{finishes.length}</b> / {count} — Siguiente: <b>{names[finishes.length] ?? `P${finishes.length + 1}`}</b>
          </p>

          <h2 style={{marginTop:16}}>Resultados</h2>
          <div style={{overflowX:'auto'}}>
            <table width="100%" cellPadding={8} style={{borderCollapse:'collapse', minWidth:480}}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Competidor</th>
                  <th>Tiempo</th>
                  <th>Gap</th>
                </tr>
              </thead>
              <tbody>{tableRows}</tbody>
            </table>
          </div>

          {stage === 'done' && (
            <div style={{marginTop:12, color:'#2563eb', fontWeight:600}}>
              Carrera finalizada automáticamente (se registraron {count} llegadas).
            </div>
          )}
        </>
      )}
    </div>
  )
}
