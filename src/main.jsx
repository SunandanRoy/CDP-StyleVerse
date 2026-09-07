import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { BrandProvider } from './context/BrandContext.jsx'
import './index.css'

// The standalone single-file artifact build can be hosted at any path (not
// necessarily the origin root), so it uses hash-based routing there; the
// server-hosted app keeps normal paths (server/index.js has a catch-all
// fallback to index.html for deep links).
const Router = import.meta.env.VITE_STANDALONE === 'true' ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <BrandProvider>
        <App />
      </BrandProvider>
    </Router>
  </React.StrictMode>
)
