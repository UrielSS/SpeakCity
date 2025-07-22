import { useState, useEffect } from 'react'
import './App.css'
import ChatBox from './ChatBox'
import Dashboard from './Dashboard'
import Model from './Model'
import TrafficSimulation from './TrafficSimulation';

function App() {
  const [users, setUsers] = useState([])
  const [numCarros, setNumCarros] = useState(0)
  const [callesAbiertas, setCallesAbiertas] = useState(0)
  const [callesCerradas, setCallesCerradas] = useState(0)

  return (
    <div className="app-container">
     
      {/* Header principal */}
      <header className="app-header">
        <h1 className="app-title">SpeakCity</h1>
        <p className="app-subtitle">Una ciudad con la que puedes hablar</p>
      </header>

      {/* Contenido principal */}
      <main className="main-content">

        {/* Dashboard principal */}
        <Dashboard
          numCarros={numCarros}
          callesAbiertas={callesAbiertas}
          callesCerradas={callesCerradas}
        />

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
              <Model
                setNumCarros={setNumCarros}
                setCallesAbiertas={setCallesAbiertas}
                setCallesCerradas={setCallesCerradas}
              />
            </div>
          </section>
        </div>

        {/* Mapa 2 */}
        <div className="app-container">
          <h1>Simulación de Tráfico</h1>
          <TrafficSimulation />
        </div>
      </main>
    </div>
  );
}

export default App