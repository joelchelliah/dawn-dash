import React from 'react'

import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import CardCodex from './pages/CardCodex'
import NotFound from './pages/NotFound'
import Speedruns from './pages/Speedruns'
import './index.scss'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Speedruns />} />

        <Route path="/codex/cards" element={<CardCodex />} />

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
