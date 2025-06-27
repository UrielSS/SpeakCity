import React, { useRef, useEffect, useState } from "react";
import './Model.css';

const Model = () => {
    const mountRef = useRef(null);
    const [estadoMapa, setEstadoMapa] = useState({
        calles_cerradas: [],
        semaforos: {},
        vehiculos: [],
        incidentes: {}
    });
    const [error, setError] = useState(null);

    // Configuración del mapa
    const numVertStreets = 4;
    const numHorStreets = 3;
    const canvasWidth = 500;
    const canvasHeight = 400;
    const wVS = Math.floor(canvasWidth / numVertStreets);
    const wHS = Math.floor(canvasHeight / numHorStreets);

    // Mapeo de calles a posiciones
    const callesPosiciones = {
        'V1': 1, 'V2': 2, 'V3': 3, 'V4': 4,
        'H1': 1, 'H2': 2, 'H3': 3
    };

    // Colores para semáforos
    const coloresSemaforos = {
        'verde': '#00FF00',
        'amarillo': '#FFFF00',
        'rojo': '#FF0000'
    };

    // Función para obtener el estado del mapa desde el backend
    const obtenerEstadoMapa = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/mapa/estado');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setEstadoMapa(data.estado);
                    setError(null);
                }
            }
        } catch (err) {
            setError('Error conectando con el backend');
            console.error('Error obteniendo estado del mapa:', err);
        }
    };

    // Actualizar estado del mapa cada 100ms
    useEffect(() => {
        const interval = setInterval(obtenerEstadoMapa, 100);
        return () => clearInterval(interval);
    }, []);

    // Función para dibujar el mapa
    const dibujarMapa = (ctx) => {
        // Limpiar canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Dibujar fondo
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Dibujar calles verticales
        for (let i = 1; i < numVertStreets; i++) {
            const calle = `V${i}`;
            const x = wVS * i;
            
            // Verificar si la calle está cerrada
            const calleCerrada = estadoMapa.calles_cerradas.includes(calle);
            
            if (calleCerrada) {
                // Calle cerrada - dibujar en rojo
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 12;
            } else {
                // Calle abierta - dibujar en negro
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 8;
            }

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();

            // // Dibujar semáforo en la intersección
            // if (estadoMapa.semaforos[calle]) {
            //     const estadoSemaforo = estadoMapa.semaforos[calle].estado;
            //     const colorSemaforo = coloresSemaforos[estadoSemaforo] || '#00FF00';
                
            //     ctx.fillStyle = colorSemaforo;
            //     ctx.beginPath();
            //     ctx.arc(x, 20, 8, 0, 2 * Math.PI);
            //     ctx.fill();
                
            //     // Borde del semáforo
            //     ctx.strokeStyle = '#000000';
            //     ctx.lineWidth = 2;
            //     ctx.stroke();
            // }
        }

        // Dibujar calles horizontales
        for (let i = 1; i < numHorStreets; i++) {
            const calle = `H${i}`;
            const y = wHS * i;
            
            // Verificar si la calle está cerrada
            const calleCerrada = estadoMapa.calles_cerradas.includes(calle);
            
            if (calleCerrada) {
                // Calle cerrada - dibujar en rojo
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 12;
            } else {
                // Calle abierta - dibujar en negro
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 8;
            }

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();

            

            // Dibujar semáforo en la intersección
            // if (estadoMapa.semaforos[calle]) {
            //     const estadoSemaforo = estadoMapa.semaforos[calle].estado;
            //     const colorSemaforo = coloresSemaforos[estadoSemaforo] || '#00FF00';
                
            //     ctx.fillStyle = colorSemaforo;
            //     ctx.beginPath();
            //     ctx.arc(20, y, 8, 0, 2 * Math.PI);
            //     ctx.fill();
                
            //     // Borde del semáforo
            //     ctx.strokeStyle = '#000000';
            //     ctx.lineWidth = 2;
            //     ctx.stroke();
            // }
        }

        // Dibujar vehículos
        estadoMapa.vehiculos.forEach(vehiculo => {
            //if (!vehiculo.activo) return;

            const calle = vehiculo.calle;
            const posicion = vehiculo.posicion;
            
            if (calle.startsWith('V')) {
                // Vehículo en calle vertical
                const calleIndex = parseInt(calle.substring(1));
                const x = wVS * calleIndex;
                const y = posicion;
                
                // Verificar si la calle está cerrada
                //if (estadoMapa.calles_cerradas.includes(calle)) return;
                
                // Dibujar vehículo
                ctx.fillStyle = vehiculo.color;
                ctx.fillRect(x - 6, y - 4, 12, 8);
                
                // Borde del vehículo
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.strokeRect(x - 6, y - 4, 12, 8);
                
            } else if (calle.startsWith('H')) {
                // Vehículo en calle horizontal
                const calleIndex = parseInt(calle.substring(1));
                const x = posicion;
                const y = wHS * calleIndex;
                
                // Verificar si la calle está cerrada
                //if (estadoMapa.calles_cerradas.includes(calle)) return;
                
                // Dibujar vehículo
                ctx.fillStyle = vehiculo.color;
                ctx.fillRect(x - 4, y - 6, 8, 12);
                
                // Borde del vehículo
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.strokeRect(x - 4, y - 6, 8, 12);
            }
        });

        // // Dibujar incidentes
        // Object.entries(estadoMapa.incidentes).forEach(([calle, incidente]) => {
        //     if (calle.startsWith('V')) {
        //         const calleIndex = parseInt(calle.substring(1));
        //         const x = wVS * calleIndex;
        //         const y = canvasHeight / 2;
                
        //         // Icono de incidente
        //         ctx.fillStyle = '#FF6B35';
        //         ctx.beginPath();
        //         ctx.arc(x, y, 15, 0, 2 * Math.PI);
        //         ctx.fill();
                
        //         // Símbolo de advertencia
        //         ctx.fillStyle = '#FFFFFF';
        //         ctx.font = 'bold 12px Arial';
        //         ctx.textAlign = 'center';
        //         ctx.fillText('!', x, y + 4);
                
        //     } else if (calle.startsWith('H')) {
        //         const calleIndex = parseInt(calle.substring(1));
        //         const x = canvasWidth / 2;
        //         const y = wHS * calleIndex;
                
        //         // Icono de incidente
        //         ctx.fillStyle = '#FF6B35';
        //         ctx.beginPath();
        //         ctx.arc(x, y, 15, 0, 2 * Math.PI);
        //         ctx.fill();
                
        //         // Símbolo de advertencia
        //         ctx.fillStyle = '#FFFFFF';
        //         ctx.font = 'bold 12px Arial';
        //         ctx.textAlign = 'center';
        //         ctx.fillText('!', x, y + 4);
        //     }
        // });

        // Dibujar etiquetas de calles
        ctx.fillStyle = '#F00000';
        ctx.font = 'bold 25px Arial';
        ctx.textAlign = 'left';
        
        // Etiquetas verticales
        for (let i = 1; i < numVertStreets; i++) {
            const x = wVS * i;
            ctx.fillText(`V${i}`, x, 15);
        }
        
        // Etiquetas horizontales
        for (let i = 1; i < numHorStreets; i++) {
            const y = wHS * i;
            ctx.fillText(`H${i}`, 15, y + 4);
        }
    };

    // Función para resetear el mapa
    const resetearMapa = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/mapa/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log('Mapa reseteado exitosamente');
                    obtenerEstadoMapa();
                }
            }
        } catch (err) {
            console.error('Error reseteando mapa:', err);
        }
    };

    // Función para cerrar una calle específica
    const cerrarCalle = async (calle) => {
        try {
            const response = await fetch('http://localhost:5000/api/mapa/cerrar-calle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ calle })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log(`Calle ${calle} cerrada`);
                    obtenerEstadoMapa();
                }
            }
        } catch (err) {
            console.error('Error cerrando calle:', err);
        }
    };

    // Función para abrir una calle específica
    const abrirCalle = async (calle) => {
        try {
            const response = await fetch('http://localhost:5000/api/mapa/abrir-calle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ calle })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log(`Calle ${calle} abierta`);
                    obtenerEstadoMapa();
                }
            }
        } catch (err) {
            console.error('Error abriendo calle:', err);
        }
    };

    // Función para cambiar semáforo
    const cambiarSemaforo = async (calle, estado) => {
        try {
            const response = await fetch('http://localhost:5000/api/mapa/semaforo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ calle, estado })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log(`Semáforo en ${calle} cambiado a ${estado}`);
                    obtenerEstadoMapa();
                }
            }
        } catch (err) {
            console.error('Error cambiando semáforo:', err);
        }
    };

    // Animación del canvas
    useEffect(() => {
        const canvas = mountRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        const animate = () => {
            dibujarMapa(ctx);
            requestAnimationFrame(animate);
        };
        
        animate();
    }, [estadoMapa]);

    return (
        <div className="model-container">
            <div className="map-header">
                <h3>Mapa de la Ciudad - SpeakCity</h3>
                {error && <div className="error-message">{error}</div>}
            </div>
            
            <canvas 
                ref={mountRef} 
                width={canvasWidth} 
                height={canvasHeight}
                style={{ border: '2px solid #333', borderRadius: '8px' }}
            />
            
            <div className="map-controls">
                <div className="control-section">
                    <h4>Controles de Calles:</h4>
                    <div className="street-controls">
                        {['V1', 'V2', 'V3'].map(calle => (
                            <div key={calle} className="street-control">
                                <span>{calle}:</span>
                                <button 
                                    onClick={() => cerrarCalle(calle)}
                                    className="btn-close"
                                    disabled={estadoMapa.calles_cerradas.includes(calle)}
                                >
                                    Cerrar
                                </button>
                                <button 
                                    onClick={() => abrirCalle(calle)}
                                    className="btn-open"
                                    disabled={!estadoMapa.calles_cerradas.includes(calle)}
                                >
                                    Abrir
                                </button>
                            </div>
                        ))}
                        {['H1', 'H2'].map(calle => (
                            <div key={calle} className="street-control">
                                <span>{calle}:</span>
                                <button 
                                    onClick={() => cerrarCalle(calle)}
                                    className="btn-close"
                                    disabled={estadoMapa.calles_cerradas.includes(calle)}
                                >
                                    Cerrar
                                </button>
                                <button 
                                    onClick={() => abrirCalle(calle)}
                                    className="btn-open"
                                    disabled={!estadoMapa.calles_cerradas.includes(calle)}
                                >
                                    Abrir
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="control-section">
                    <button onClick={resetearMapa} className="btn-reset">
                        🔄 Resetear Mapa
                    </button>
                </div>
            </div>
            
            <div className="map-legend">
                <h4>Leyenda:</h4>
                <div className="legend-items">
                    <div className="legend-item">
                        <div className="legend-color" style={{backgroundColor: '#333333'}}></div>
                        <span>Calle Abierta</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{backgroundColor: '#FF0000'}}></div>
                        <span>Calle Cerrada</span>
                    </div>
                    {/* <div className="legend-item">
                        <div className="legend-color" style={{backgroundColor: '#FF6B35'}}></div>
                        <span>Incidente</span>
                    </div> */}
                </div>
            </div>
        </div>
    );
};

export default Model; 