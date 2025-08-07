import React, { useState, useEffect, useContext } from 'react';
import { TrafficContext } from './TrafficContext';
import './styles/ChatBox.css';

function ChatBox() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [error, setError] = useState('');
  const [ejecutandoComandos, setEjecutandoComandos] = useState(false);
  const [comandosEnProceso, setComandosEnProceso] = useState([]);
  const { closeStreet, openStreet, changeTrafficLight_red, changeTrafficLight_green, 
          deactivateTrafficLight, activateTrafficLight, changeTrafficLightTimeInterval
   } = useContext(TrafficContext);

  // Verificar estado del backend al cargar
  useEffect(() => {
    checkBackendStatus();
  }, []);

  const checkBackendStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/status');
      if (res.ok) {
        const data = await res.json();
        setBackendStatus(data.demo_mode ? 'demo' : 'connected');
      } else {
        setBackendStatus('error');
      }
    } catch (error) {
      setBackendStatus('error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || loading || backendStatus === 'error') return;
    
    setLoading(true);
    setResponse('');
    setError('');
    
    try {
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      
      const data = await res.json();
      console.log('Respuesta del servidor:', data);

      if (data.success && data.response) {
        // Verificar si es respuesta múltiple o individual
        if (data.multiple_commands && data.response.comandos) {
          // MÚLTIPLES COMANDOS
          setResponse(data.response);
          await ejecutarComandosSecuencialmente(data.response.comandos);
          mostrarNotificacionMultiple(data.response);
        } else {
          // COMANDO INDIVIDUAL
          const comando = data.response;
          aplicarComandoIndividual(comando);
          setResponse(comando);
          mostrarNotificacionComando(comando);
        }

        if (data.demo_mode) {
          setBackendStatus('demo');
        } else {
          setBackendStatus('connected');
        }

      } else {
        // Comando inválido
        setError(data.error || 'El mensaje no fue entendido como comando de tráfico.');
        if (data.suggestion) {
          setError(prev => `${prev}\n\n💡 ${data.suggestion}`);
        }
        setBackendStatus('connected');
      }

    } catch (error) {
      setError(`Error de conexión: ${error.message}`);
      setBackendStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Función para aplicar un comando individual(Aca puede ir lo de los semaforos tambien y lo de desviar trafico)
  const aplicarComandoIndividual = (comando) => {
    const { accion, calle, causa, duracion_estimada, duracion_estimada_segundos } = comando;

    if (
      accion === 'cerrar_calle' ||
      accion === 'bloquear_via' ||
      accion === 'cerrar_cruce'
    ) {
      closeStreet(calle);
    } else if (
      accion === 'abrir_calle' ||
      accion === 'desbloquear_via' ||
      accion === 'abrir_cruce'
    ) {
      openStreet(calle);
    } else if (accion == 'cambiar_semaforo_rojo') {
      changeTrafficLight_red(calle);
    } else if (accion == 'cambiar_semaforo_verde') {
      changeTrafficLight_green(calle);
    } else if (accion == 'desactivar_semaforo') {
      deactivateTrafficLight(calle);
    } else if (accion == 'activar_semaforo') {
      activateTrafficLight(calle);
    } else if (accion == 'programar_semaforo') {
      changeTrafficLightTimeInterval(calle, duracion_estimada_segundos);
    }


  };

  // Nueva función para ejecutar múltiples comandos secuencialmente
  const ejecutarComandosSecuencialmente = async (comandos) => {
    setEjecutandoComandos(true);
    setComandosEnProceso([]);

    for (let i = 0; i < comandos.length; i++) {
      const comando = comandos[i];
      
      // Actualizar estado de comandos en proceso
      setComandosEnProceso(prev => [
        ...prev.map(cmd => ({ ...cmd, estado: 'completado' })),
        { ...comando, estado: 'ejecutando', indice: i }
      ]);

      // Aplicar el comando al sistema
      aplicarComandoIndividual(comando);

      // Mostrar notificación individual
      mostrarNotificacionComandoSecuencial(comando, i + 1, comandos.length);

      // Pausa entre comandos para visualización
      if (i < comandos.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    // Marcar todos como completados
    setComandosEnProceso(prev => 
      prev.map(cmd => ({ ...cmd, estado: 'completado' }))
    );

    setEjecutandoComandos(false);
    
    // Limpiar
    setTimeout(() => {
      setComandosEnProceso([]);
    }, 3000);
  };

  // Notificación para comando individual (lógica original)
  const mostrarNotificacionComando = (comando) => {
    const notificacion = document.createElement('div');
    notificacion.className = 'comando-notificacion';
    notificacion.innerHTML = `
      <div class="notificacion-contenido">
        <h4>✅ Comando Ejecutado</h4>
        <p><strong>Acción:</strong> ${comando.accion}</p>
        <p><strong>Calle:</strong> ${comando.calle}</p>
        <p><strong>Causa:</strong> ${comando.causa}</p>
        <p><strong>Prioridad:</strong> ${comando.prioridad}</p>
      </div>
    `;
    
    mostrarNotificacionTemporal(notificacion);
  };

  // Nueva notificación para múltiples comandos
  const mostrarNotificacionMultiple = (respuesta) => {
    const notificacion = document.createElement('div');
    notificacion.className = 'comando-notificacion multiple';
    notificacion.innerHTML = `
      <div class="notificacion-contenido">
        <h4>🚦 Múltiples Comandos Ejecutados</h4>
        <p><strong>Total:</strong> ${respuesta.total_comandos} comandos</p>
        <p><strong>Resumen:</strong> ${respuesta.resumen_general}</p>
        <div class="comandos-lista">
          ${respuesta.orden_ejecucion.map(orden => `<div class="comando-item">• ${orden}</div>`).join('')}
        </div>
      </div>
    `;
    
    mostrarNotificacionTemporal(notificacion, 8000);
  };

  // Notificación secuencial durante la ejecución
  const mostrarNotificacionComandoSecuencial = (comando, numero, total) => {
    const notificacion = document.createElement('div');
    notificacion.className = 'comando-notificacion secuencial';
    notificacion.innerHTML = `
      <div class="notificacion-contenido">
        <h4>Ejecutando ${numero}/${total}</h4>
        <p><strong>Acción:</strong> ${comando.accion}</p>
        <p><strong>Calle:</strong> ${comando.calle}</p>
        <p><strong>Prioridad:</strong> ${comando.prioridad}</p>
      </div>
    `;
    
    // Posición diferente para notificaciones secuenciales
    notificacion.style.top = `${85 + (numero * 10)}px`;
    
    mostrarNotificacionTemporal(notificacion, 3000);
  };

  // Función auxiliar para mostrar notificaciones temporales
  const mostrarNotificacionTemporal = (notificacion, duracion = 6000) => {
    notificacion.style.cssText += `
      position: fixed;
      top: 65px;
      right: 20px;
      background: linear-gradient(135deg,rgb(184, 192, 228) 0%,rgb(191, 181, 200) 100%);
      color: white;
      padding: 15px;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      max-width: 400px;
      animation: slideIn 0.5s ease-out;
    `;
    
    // Agregar animación CSS
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .comando-notificacion.multiple {
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        }
        .comando-notificacion.secuencial {
          background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
          max-width: 300px;
          padding: 10px;
        }
        .comandos-lista {
          margin-top: 10px;
          font-size: 0.9em;
        }
        .comando-item {
          margin: 2px 0;
          opacity: 0.9;
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notificacion);
    
    // Remover la notificación
    setTimeout(() => {
      notificacion.style.animation = 'slideOut 0.5s ease-in';
      notificacion.style.transform = 'translateX(100%)';
      notificacion.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(notificacion)) {
          document.body.removeChild(notificacion);
        }
      }, 500);
    }, duracion);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleExampleClick = (example) => {
    setMessage(example);
    const textarea = document.querySelector('.chat-input');
    if (textarea) {
      textarea.focus();
    }
  };

  const getStatusMessage = () => {
    switch (backendStatus) {
      case 'connected':
        return { text: '✅ Conectado al backend', class: 'status-connected' };
      case 'demo':
        return { text: '🔄 Modo demo activo', class: 'status-demo' };
      case 'error':
        return { text: '❌ Error de conexión', class: 'status-error' };
      default:
        return { text: '⏳ Verificando conexión...', class: 'status-checking' };
    }
  };

  const statusInfo = getStatusMessage();

  // Lista ampliada de ejemplos para múltiples comandos
  const examples = [
    "Cierra la calle H20 por mantenimiento",
    "Cierra de inmediato las calles H21, V21 y H22 por un supuesto accidente. Acto seguido, extiende la zona de restricción cerrando también V22 y H23 como medida preventiva, esto ya con menor prioridad",
    // "La calle V32 se acaba de inundar",
    // "Accidente en V11: cierra la calle, reporta incidente y redirige tráfico por V12",
    // "Emergencia en H20: bloquea vía, cambia semáforo en H21 y activa protocolo de emergencia",
    // "Construcción en V23: cierra calle, reduce velocidad en V22 y programa semáforo en H13"
  ];

  return (
    <div className="chat-container">
      <h2>Introduce tus comandos: </h2>
      
      {/* Indicador de estado del backend */}
      <div className={`backend-status ${statusInfo.class}`}>
        {statusInfo.text}
        {backendStatus === 'demo' && (
          <span className="demo-note">
            (Configura GOOGLE_API_KEY en config.env para usar IA real)
          </span>
        )}
      </div>

      {/* Indicador de comandos en ejecución */}
      {ejecutandoComandos && (
        <div className="ejecucion-status">
          <div className="ejecucion-indicator">
            ⚡ Ejecutando comandos secuencialmente...
          </div>
          <div className="comandos-progreso">
            {comandosEnProceso.map((cmd, index) => (
              <div key={index} className={`comando-progreso ${cmd.estado}`}>
                {cmd.estado === 'ejecutando' ? '🔄 ' : '✅ '} 
                {cmd.accion} en {cmd.calle}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="chat-form">
        <div className="input-group">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ejemplo: cierra calle V11 por accidente y cambia semáforo en H12... (Presiona Enter para enviar)"
            className="chat-input"
            rows="3"
            disabled={loading || backendStatus === 'error' || ejecutandoComandos}
          />
          <button
            type="submit"
            className="chat-button"
            disabled={loading || !message.trim() || backendStatus === 'error' || ejecutandoComandos}
          >
            {loading ? 'Procesando...' : ejecutandoComandos ? 'Ejecutando...' : 'Enviar Comando'}
          </button>
        </div>
      </form>

      {/* Mensaje de error */}
      {error && (
        <div className="error-container">
          <h3>❌ Error:</h3>
          <div className="error-text">
            {error.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {/* Respuesta del sistema
      {response && !ejecutandoComandos && (
        <div className="response-container">
          <h3>📋 Última Respuesta:</h3>
          {response.comandos ? (
            // Respuesta múltiple
            <div className="multiple-response">
              <p><strong>Total de comandos:</strong> {response.total_comandos}</p>
              <p><strong>Resumen:</strong> {response.resumen_general}</p>
              <div className="comandos-detalle">
                <h4>Comandos ejecutados:</h4>
                {response.comandos.map((cmd, index) => (
                  <div key={index} className="comando-detalle">
                    <strong>{index + 1}.</strong> {cmd.accion} en {cmd.calle} 
                    <span className="comando-meta">
                      (Causa: {cmd.causa}, Prioridad: {cmd.prioridad})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Respuesta individual
            <div className="single-response">
              <p><strong>Acción:</strong> {response.accion}</p>
              <p><strong>Calle:</strong> {response.calle}</p>
              <p><strong>Causa:</strong> {response.causa}</p>
              <p><strong>Prioridad:</strong> {response.prioridad}</p>
            </div>
          )}
        </div>
      )} */}

      {/* Ejemplos de comandos */}
      <div className="examples-container">
        <h4>💡 Ejemplos de comandos (click para usar):</h4>
        <ul className="examples-list">
          {examples.map((example, index) => (
            <li 
              key={index}
              onClick={() => handleExampleClick(example)}
              className="example-item"
            >
              {example}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ChatBox;