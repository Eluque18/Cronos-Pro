import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './Home'
import StopwatchPage from './StopwatchPage'
import RacePage from './RacePage'
import IntervalsPage from './IntervalsPage'

const el = document.getElementById('root')
if (!el) throw new Error('No se encontró #root')

ReactDOM.createRoot(el).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stopwatch" element={<StopwatchPage />} />
        <Route path="/race" element={<RacePage />} />
        <Route path="/intervals" element={<IntervalsPage />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
)
