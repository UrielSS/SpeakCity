import React, { useState, useEffect } from 'react'
import './App.css'
import ChatBox from './ChatBox'
import { TrafficContext } from './TrafficContext';
import Dashboard from './Dashboard'
import Model from './Model'
import TrafficSimulation from './TrafficSimulation';

function App() {
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false);
  // const [numCarros, setNumCarros] = useState(0)
  // const [callesAbiertas, setCallesAbiertas] = useState(0)
  // const [callesCerradas, setCallesCerradas] = useState(0)
  const [trafficAPI, setTrafficAPI] = React.useState({});

  return (
    <div className="app-container">
     
      {/* Header principal */}
      <header className="app-header">
        <img src="assets/SpeakLogo.png" alt="Logo" className="logo" />
        <h1 className="app-title">SpeakCity</h1>
        <button className="about-button" onClick={() => setShowModal(true)}>
          Acerca de
        </button>
      </header>

      {/* Modal de información */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Acerca de Nosotros</h2>
            <p>
              
            </p>
            <button onClick={() => setShowModal(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <main className="main-content">

        {/* Dashboard principal */}
        {/* <Dashboard
          numCarros={numCarros}
          callesAbiertas={callesAbiertas}
          callesCerradas={callesCerradas}
        /> */}

        {/* Layout de chat y mapa */}
        <div className="app-layout">
          <TrafficContext.Provider value={trafficAPI}>
          {/* Sección del chat */}
          <section className="chat-section">
            <ChatBox />
          </section>

          {/* Sección del mapa */}
          <section className="map-section">
            <div className="map-placeholder">
              <h3>Mapa de la Ciudad</h3>
                <TrafficSimulation setTrafficAPI={setTrafficAPI} />
              {/*<TrafficSimulation />*/}
            </div>
          </section>
          </TrafficContext.Provider>
        </div>
      </main>
    </div>
  );
}

export default App