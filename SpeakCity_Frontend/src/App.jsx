import { useState, useEffect } from 'react'
import './App.css'
import ChatBox from './ChatBox'
import Model from './Model'

function App() {
  const [users, setUsers] = useState([])

  return (
    <div className="app-container">
     
      {/* Header principal */}
      <header className="app-header">
        <h1 className="app-title">SpeakCity</h1>
        <p className="app-subtitle">Una ciudad con la que puedes hablar</p>
      </header>

      {/* Contenido principal */}
      <main className="main-content">
        {/* Layout de chat y mapa */}
        <div className="app-layout">
          {/* Sección del chat */}
          <section className="chat-section">
            <ChatBox />
          </section>

          {/* Sección del mapa */}
          <section className="map-section">
            <div className="map-placeholder">
              <h3>Mapa de la Ciudad</h3>
              <Model />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
