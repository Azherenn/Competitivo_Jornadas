import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { EstiloSpriteProvider } from './lib/EstiloSpriteContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <EstiloSpriteProvider>
      <App />
    </EstiloSpriteProvider>
  </React.StrictMode>
)
