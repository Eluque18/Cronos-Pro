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
  const [names, setNames] = useState<string[]>(
    () => Array.from({ length: 5 }, (_, i) => `P${i + 1}`)
  )

  // Estado para render
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [finishes, setFinishes] = useState<number[]>([])
  const [finishNames, setFinishNames] = useState<string[]>([])

  // Refs: fuente de verdad para el RAF
  const runningRef = useRef(false)
  const t0Ref = useRef<number | null>(null)
  const accRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  // Ajusta el array de nombres al tamaño "count"
  useEffect(() => {
    setNames(prev => {
      const arr = prev.slice(0, count)
      while (arr.length < count) arr.push(`P${arr.length + 1}`)
      return arr
    })
  }, [count])

  // Frame loop
  const tick = () => {
    if (!runningRef.current || t0Ref.current == null) return
    const now = performance.now()
    const delta = now - t0Ref.current
    setElapsed(accRef.current + delta)
    rafRef.current = requestAnimationFrame(tick)
  }

  // Paso 1: confirmar (no arranca reloj)
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

  // Paso 2: start (arranca reloj)
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
    <div className="container">
      <div className="header">
        <h1 className="h1">Carrera multi-competidor</h1>
        <Link to="/"><button className="btn">Home</button></Link>
      </div>

      <div className="card">
        {/* SETUP */}
        {stage === 'setup' && (
          <div className="grid" style={{gap:12}}>
            <label className="row">
              <small className="subtle">Cantidad</small>
              <input
                className="number"
                type="number" min={1} max={200}
                value={count}
                onChange={e => setCount(Math.max(1, Math.min(200, Number(e.target.value || 1))))}
                style={{maxWidth:120}}
              />
            </label>

            <div className="grid" style={{gap:8}}>
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="grid grid-setup">
                  <div className="subtle">Pos {i+1}</div>
                  <input
                    className="input"
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
                  />
                </div>
              ))}
            </div>

            <div className="actions sticky-actions">
              <button className="btn btn-primary" onClick={confirmRace}>
                Confirmar carrera
              </button>
            </div>
          </div>
        )}

        {/* READY */}
        {stage === 'ready' && (
          <>
            <div className="subtle">Competidores listos: {count}</div>
            <div className="timer">{fmt(0)}</div>
            <div className="actions sticky-actions">
              <button className="btn btn-primary" onClick={start}>Start</button>
              <button className="btn btn-ghost" onClick={reset}>Volver a editar</button>
            </div>
            <div className="subtle">Siguiente en llegar: <b>{names[finishes.length] ?? `P${finishes.length + 1}`}</b></div>
          </>
        )}

        {/* RUNNING / DONE */}
        {(stage === 'running' || stage === 'done') && (
          <>
            <div className="timer">{fmt(elapsed)}</div>

            <div className="actions sticky-actions">
              {running
                ? <button className="btn" onClick={stop}>Stop</button>
                : (stage !== 'done'
                    ? <button className="btn btn-primary" onClick={start}>Start</button>
                    : <button className="btn" disabled>Finalizado</button>)
              }
              <button className="btn btn-ghost" onClick={reset}>Reset</button>
              {running && finishes.length < count && (
                <button className="btn btn-accent" onClick={markNext}>Next Position</button>
              )}
            </div>

            <p className="subtle" style={{marginTop:8}}>
              Llegadas registradas: <b>{finishes.length}</b> / {count} — Siguiente: <b>{names[finishes.length] ?? `P${finishes.length + 1}`}</b>
            </p>

            <h3 style={{color:'#e5e7eb'}}>Resultados</h3>
            <div className="table-wrap">
              <table>
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
              <div style={{marginTop:12, color:'#38bdf8', fontWeight:600}}>
                Carrera finalizada automáticamente (se registraron {count} llegadas).
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

