import React from 'react'

import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import CardCodex from './pages/CardCodex'
import NotFound from './pages/NotFound'
import Speedruns from './pages/Speedruns'
import TalentCodex from './pages/TalentCodex'

import './index.scss'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Speedruns />} />

        <Route path="/codex/cards" element={<CardCodex />} />
        <Route path="/codex/wip/super-secret/dont-look/talents" element={<TalentCodex />} />

        {/* Old route */}
        <Route path="/misc/codex/cards" element={<Navigate to="/codex/cards" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/serviceWorker.js')
  })
}
