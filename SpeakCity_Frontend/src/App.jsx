import React, { useState, useEffect } from 'react'
import './styles/App.css'
import ChatBox from './ChatBox'
import { TrafficContext } from './TrafficContext';
import Dashboard from './Dashboard'
import TrafficSimulation from './TrafficSimulation';

function App() {
  const [showModal, setShowModal] = useState(false);
  const [numCarros, setNumCarros] = useState(0);
  const [callesAbiertas, setCallesAbiertas] = useState(0);
  const [callesCerradas, setCallesCerradas] = useState(0);
  const [semaforosHabilitados, setSemaforosHabilitados] = useState(0);
  const [semaforosInhabilitados, setSemaforosInhabilitados] = useState(0);
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
              Ola
            </p>
            <button onClick={() => setShowModal(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <main className="main-content">
        {/* Proveedor de contexto envolviendo TODO si es necesario */}
        <TrafficContext.Provider value={trafficAPI}>

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
                <TrafficSimulation setTrafficAPI={setTrafficAPI}
                  setCloseStreets={(n) => setCallesCerradas(n)}
                  setOpenStreets={(n) => setCallesAbiertas(n)}
                  setNumCars={(n) => setNumCarros(n)} 
                  setSemaforosHabilit={(n) => setSemaforosHabilitados(n)}
                  setSemaforosInhabilit={(n) => setSemaforosInhabilitados(n)}/>
              </div>
            </section>
          </div>

          {/* Dashboard principal */}
          <Dashboard
            numCarros={numCarros}
            callesAbiertas={callesAbiertas}
            callesCerradas={callesCerradas}
            numSemaforosHabilitados={semaforosHabilitados}
            numSemaforosInhabilitados={semaforosInhabilitados}
          />

        </TrafficContext.Provider>
      </main>

    </div>
  );
}

export default App