import { useState, useEffect } from 'react';
import './ChatBox.css';

function ChatBox() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [error, setError] = useState('');

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
      console.log(data);
      
      if (data.success) {
        setResponse(data.response);
        // Actualizar estado del backend si es demo
        if (data.demo_mode) {
          setBackendStatus('demo');
        }
        
        // Mostrar notificación de comando procesado
        mostrarNotificacionComando(data.response);
      } else {
        setError(data.error || 'Error desconocido');
        if (data.suggestion) {
          setError(prev => prev + `\n\nSugerencia: ${data.suggestion}`);
        }
      }
    } catch (error) {
      setError(`Error de conexión: ${error.message}`);
      setBackendStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const mostrarNotificacionComando = (comando) => {
    // Crear una notificación visual del comando procesado
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
    
    // Agregar estilos
    notificacion.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      max-width: 300px;
      animation: slideIn 0.5s ease-out;
    `;
    
    // Agregar animación CSS
    const style = document.createElement('style');
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
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notificacion);
    
    // Remover la notificación después de 4 segundos
    setTimeout(() => {
      notificacion.style.animation = 'slideOut 0.5s ease-in';
      notificacion.style.transform = 'translateX(100%)';
      notificacion.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(notificacion);
      }, 500);
    }, 4000);
  };

  const handleKeyPress = (e) => {
    // Enviar con Enter (pero no con Shift+Enter para permitir saltos de línea)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleExampleClick = (example) => {
    setMessage(example);
    // Opcional: hacer focus en el textarea
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

  // Lista de ejemplos
  const examples = [
    "Cierra la calle H2 por mantenimiento",
    "Acaba de haber un choque en la calle V1, bloque el paso",
    "La calle V3 se acaba de inundar"
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
      
      <form onSubmit={handleSubmit} className="chat-form">
        <div className="input-group">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ejemplo: cierra la calle V1 por congestión... (Presiona Enter para enviar)"
            className="chat-input"
            rows="3"
            disabled={loading || backendStatus === 'error'}
          />
          <button
            type="submit"
            className="chat-button"
            disabled={loading || !message.trim() || backendStatus === 'error'}
          >
            {loading ? 'Procesando...' : 'Enviar Comando'}
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

      {/* Respuesta del sistema */}
      {response && (
        <div className="response-container">
          <h3>📋 Comando Procesado:</h3>
          <div className="response-text">
             <p><strong>Acción:</strong> {response.accion}</p>
             <p><strong>Calle:</strong> {response.calle}</p>
             <p><strong>Causa:</strong> {response.causa}</p>
             <p><strong>Prioridad:</strong> {response.prioridad}</p>
             <p><strong>Duración estimada:</strong> {response.duracion_estimada || 'No especificada'} en minutos</p>
          </div>
        </div>
      )}

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