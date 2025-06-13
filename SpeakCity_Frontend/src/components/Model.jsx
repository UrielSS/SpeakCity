import React, { useRef, useEffect, useState } from "react";

const Model = () => {
    const mountRef = useRef(null);
    const numVertStreets = 4;
    const numHorStreets = 3;
    const [isStreetClosed, setIsStreetClosed] = useState(false);
    const [shouldStop, setShouldStop] = useState(false);
    const animationRef = useRef(null);
    const carPositionRef = useRef(0);

    useEffect(() => {
        const canvas = mountRef.current;
        const ctx = canvas.getContext("2d");
        const wVS = Math.floor(canvas.width / numVertStreets);
        const wHS = Math.floor(canvas.height / numHorStreets);
        const streetWidth = 10;
        ctx.lineWidth = streetWidth;
        
        // Cargar imagen del carrito
        const carritoImg = new Image();
        carritoImg.src = "/img/carro.png";
        const posY = wHS * 1 - streetWidth / 2 - 15;
        const speed = 2;

        function drawStreets() {
            ctx.strokeStyle = "#000";
            // Calles verticales
            for (let i = 1; i < numVertStreets; i++) {
                ctx.beginPath();
                ctx.moveTo(wVS * i, 0);
                ctx.lineTo(wVS * i, canvas.height);
                ctx.stroke();
            }
            
            // Calles horizontales
            for (let i = 1; i < numHorStreets; i++) {
                ctx.beginPath();
                ctx.moveTo(0, wHS * i);
                ctx.lineTo(canvas.width, wHS * i);
                // Cambiar color de la segunda línea horizontal si está cerrada
                if (i === 1 && isStreetClosed) {
                    ctx.strokeStyle = "red";
                } else {
                    ctx.strokeStyle = "#000";
                }
                ctx.stroke();
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawStreets();
            
            // Dibujar carrito
            ctx.drawImage(carritoImg, carPositionRef.current, posY, 30, 30);
            
            // Verificar si debe detenerse
            const stopPosition = wVS * 2; // Detenerse en la segunda calle vertical
            const isAtStopPosition = carPositionRef.current >= stopPosition - 30 && 
                                   carPositionRef.current <= stopPosition + 10;
            
            if (isStreetClosed && isAtStopPosition) {
                setShouldStop(true);
            } else {
                // Actualizar posición solo si no debe detenerse
                if (!shouldStop) {
                    carPositionRef.current += speed;
                    if (carPositionRef.current > canvas.width) {
                        carPositionRef.current = -30;
                    }
                }
            }
            
            animationRef.current = requestAnimationFrame(animate);
        }

        carritoImg.onload = () => {
            animate();
        };

        return () => {
            cancelAnimationFrame(animationRef.current);
        };
    }, [isStreetClosed, shouldStop]);

    const handleClick = () => {
        setIsStreetClosed(!isStreetClosed);
        setShouldStop(false); // Reanudar movimiento al cambiar el estado
    };

    return (
        <div className="calles">
            <canvas ref={mountRef} width={500} height={400}></canvas>
            <button id="cerrar" onClick={handleClick}>
                {isStreetClosed ? "Abrir calle" : "Cerrar calle"}
            </button>
        </div>
    );
};

export default Model;