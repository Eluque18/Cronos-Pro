import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="container">
      <div className="header">
        <h1 className="h1">CronoPro</h1>
      </div>

      <div className="card">
        <p className="subtle" style={{marginTop:0}}>Selecciona una herramienta</p>
        <div className="menu">
          <Link to="/stopwatch"><button className="btn btn-primary">Cronómetro</button></Link>
          <Link to="/race"><button className="btn btn-accent">Carrera multi-competidor</button></Link>
          <Link to="/intervals"><button className="btn btn-ghost">Timer de intervalos</button></Link>
        </div>
      </div>
    </div>
  )
}
