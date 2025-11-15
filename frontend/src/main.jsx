// --- Pega esto en frontend/src/main.jsx ---

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // <--- Esta línea es VITAL

// La línea de index.css fue borrada

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)