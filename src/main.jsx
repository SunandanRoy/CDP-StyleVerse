import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { BrandProvider } from './context/BrandContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <BrandProvider>
        <App />
      </BrandProvider>
    </BrowserRouter>
  </React.StrictMode>
)
