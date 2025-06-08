import { useState } from 'react';
import './ChatBox.css';

function ChatBox() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    setLoading(true);
    setResponse('');
    
    try {
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setResponse(data.response);
      } else {
        setResponse(`Error: ${data.error}`);
      }
    } catch (error) {
      setResponse(`Error de conexión: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <h2>Introduce tus comandos: </h2>
      
      <form onSubmit={handleSubmit} className="chat-form">
        <div className="input-group">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe tu mensaje aquí..."
            className="chat-input"
            rows="3"
            disabled={loading}
          />
          <button
            type="submit"
            className="chat-button"
            disabled={loading || !message.trim()}
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </form>

      {response && (
        <div className="response-container">
          <h3>Respuesta:</h3>
          <div className="response-text">
             <p><strong>Acción:</strong> {response.accion}</p>
             <p><strong>Calle:</strong> {response.calle}</p>
             <p><strong>Causa:</strong> {response.causa}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatBox;