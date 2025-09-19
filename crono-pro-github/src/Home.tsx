import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div style={{padding:16, fontFamily:'system-ui'}}>
      <h1>Menú principal</h1>
      <div style={{display:'flex', flexDirection:'column', gap:12, marginTop:24}}>
        <Link to="/stopwatch"><button>Cronómetro</button></Link>
        <Link to="/race"><button>Carrera multi-competidor</button></Link>
        <Link to="/intervals"><button>Timer de intervalos</button></Link>
      </div>
    </div>
  )
}
