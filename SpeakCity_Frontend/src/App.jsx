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
          ¿Cómo Usar?
        </button>
      </header>

      {/* Modal de información */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Instrucciones de Uso</h2>
            <p>
              SpeakCity es un gemelo digital de tráfico urbano que permite simular y gestionar el flujo vehicular en una ciudad simplificada.
            </p>

            <p>Para operar semáforos, haz referencia a la intersección donde se encuentran o a su posición en la calle (arriba, abajo, izquierda, derecha).</p>
            <p>Para controlar las calles, haz referencia a su nombre en el mapa.</p>

            {/* Lista de lo que funciona */}
            <h3>Lo que funciona:</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {["Cerrar la calle V11", "Cambia a rojo el semaforo de arriba de la intersección I22", "Establece a 8 segundos el semaforo derecho de la interseción I22", "Abre todas las calles cerradas"].map((item, index) => (
                <li key={index} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                  padding: "8px",
                  backgroundColor: index % 2 === 0 ? "#f9f9f9" : "white",
                  borderRadius: "4px"
                }}>
                  <span style={{ flex: 1, marginRight: "12px" }}>{item}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(item)}
                    style={{
                      fontSize: "12px",
                      padding: "6px 12px",
                      cursor: "pointer",

                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      whiteSpace: "nowrap"
                    }}
                  >
                    Copiar
                  </button>
                </li>
              ))}
            </ul>

            {/* Lista de lo que no funciona */}
            <h3>Lo que no funciona:</h3>
            <ul>
              <li>Funciones como "Desvía el tráfico de la calle A a B"</li>
            </ul>

            <button
              onClick={() => setShowModal(false)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#e74c3c",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginTop: "20px"
              }}
            >
              Cerrar
            </button>
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

      <footer className="app-footer">
        <p>&copy; 2025 SpeakCity. Hecho por los PowerPuffGs</p>
      </footer>

    </div>
  );
}

export default App