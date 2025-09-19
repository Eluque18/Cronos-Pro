import React, { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

function format(ms: number) {
  const totalMs = Math.max(0, Math.floor(ms))
  const s = Math.floor(totalMs / 1000)
  const m = Math.floor(s / 60)
  const restS = s % 60
  const ms3 = totalMs % 1000
  return `${String(m).padStart(2,'0')}:${String(restS).padStart(2,'0')}.${String(ms3).padStart(3,'0')}`
}

export default function StopwatchPage() {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [laps, setLaps] = useState<number[]>([])
  const t0Ref = useRef<number | null>(null)
  const accRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  const tick = () => {
    if (t0Ref.current == null) return
    const now = performance.now()
    const delta = now - t0Ref.current
    setElapsed(accRef.current + delta)
    rafRef.current = requestAnimationFrame(tick)
  }

  const start = () => {
    if (running) return
    t0Ref.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)
    setRunning(true)
  }
  const pause = () => {
    if (!running) return
    if (t0Ref.current != null) accRef.current += performance.now() - t0Ref.current
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    t0Ref.current = null
    setRunning(false)
  }
  const reset = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    t0Ref.current = null
    accRef.current = 0
    setElapsed(0)
    setLaps([])
    setRunning(false)
  }
  const lap = () => setLaps(prev => [...prev, elapsed])

  const lapRows = useMemo(() => {
    return laps.map((t, i) => {
      const prev = i === 0 ? 0 : laps[i-1]
      const interval = t - prev
      const prevInterval = i === 0 ? 0 : (laps[i-1] - (i>=2 ? laps[i-2] : 0))
      const delta = i === 0 ? 0 : interval - prevInterval
      return (
        <tr key={i}>
          <td>#{i+1}</td>
          <td>{format(t)}</td>
          <td>{format(interval)}</td>
          <td>{i===0 ? '—' : (delta>=0? '+' : '-') + format(Math.abs(delta))}</td>
        </tr>
      )
    })
  }, [laps])

  return (
    <div className="container">
      <div className="header">
        <h1 className="h1">Cronómetro</h1>
        <Link to="/"><button className="btn">Home</button></Link>
      </div>

      <div className="card">
        <div className="timer">{format(elapsed)}</div>
        <div className="actions sticky-actions">
          {!running ? <button className="btn btn-primary" onClick={start}>Start</button> : <button className="btn" onClick={pause}>Pause</button>}
          <button className="btn btn-accent" onClick={lap} disabled={!running}>Lap</button>
          <button className="btn btn-ghost" onClick={reset}>Reset</button>
        </div>

        <h3 style={{color:'#e5e7eb', marginTop:20, marginBottom:8}}>Vueltas</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Total</th><th>Intervalo</th><th>Δ</th></tr>
            </thead>
            <tbody>{lapRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
