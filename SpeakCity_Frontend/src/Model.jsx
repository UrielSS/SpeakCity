import React, { useRef, useEffect, useState } from "react";

const Model = () => {
    const mountRef = useRef(null);
    const numVertStreets = 4;
    const numHorStreets = 3;

    const [segmentoCerrado, setSegmentoCerrado] = useState(false);
    const segmentoCerradoRef = useRef(false);

    const yRef = useRef(0);

    useEffect(() => {
        const canvas = mountRef.current;
        const ctx = canvas.getContext("2d");

        const wVS = Math.floor(canvas.width / numVertStreets);
        const wHS = Math.floor(canvas.height / numHorStreets);

        ctx.lineWidth = 10;

        const drawGrid = () => {
            ctx.strokeStyle = 'black';

            // Calles verticales normales
            for (let i = 1; i < numVertStreets; i++) {
                // Si es la 2ª calle vertical (índice 2) y el segmento está cerrado,
                // dibuja parte del segmento en rojo
                if (i === 2 && segmentoCerradoRef.current) {
                    // Parte antes del segmento cerrado
                    ctx.beginPath();
                    ctx.moveTo(wVS * i, 0);
                    ctx.lineTo(wVS * i, wHS);
                    ctx.stroke();

                    // Segmento cerrado (en rojo)
                    ctx.beginPath();
                    ctx.strokeStyle = 'yellow';
                    ctx.moveTo(wVS * i, wHS);
                    ctx.lineTo(wVS * i, 2 * wHS);
                    ctx.stroke();
                    ctx.strokeStyle = 'black'; // Restaurar color

                    // Parte después del segmento cerrado
                    ctx.beginPath();
                    ctx.moveTo(wVS * i, 2 * wHS);
                    ctx.lineTo(wVS * i, canvas.height);
                    ctx.stroke();
                } else {
                    // Dibujar calle normal
                    ctx.beginPath();
                    ctx.moveTo(wVS * i, 0);
                    ctx.lineTo(wVS * i, canvas.height);
                    ctx.stroke();
                }
            }

            // Calles horizontales (normales)
            ctx.strokeStyle = 'black';
            for (let i = 1; i < numHorStreets; i++) {
                ctx.beginPath();
                ctx.moveTo(0, wHS * i);
                ctx.lineTo(canvas.width, wHS * i);
                ctx.stroke();
            }
        };


        const x = wVS * 2; // 2ª calle vertical
        const radius = 6;
        const speed = 1;

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawGrid();

            // Dibuja el punto rojo
            ctx.beginPath();
            ctx.arc(x, yRef.current, radius, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();

            // Coordenadas del segmento cerrado (entre 2 calles horizontales)
            const inicioSegmento = wHS;
            const finSegmento = 2 * wHS;

            const enSegmentoCerrado =
                yRef.current >= inicioSegmento &&
                yRef.current <= finSegmento &&
                segmentoCerradoRef.current;

            if (!enSegmentoCerrado) {
                yRef.current += speed;
                if (yRef.current > canvas.height) {
                    yRef.current = 0;
                }
            }

            requestAnimationFrame(animate);
        };

        animate();
    }, []);

    // Funciones de control
    const cerrarSegmento = () => {
        setSegmentoCerrado(true);
        segmentoCerradoRef.current = true;
    };

    const abrirSegmento = () => {
        setSegmentoCerrado(false);
        segmentoCerradoRef.current = false;
    };

    return (
        <div>
            <canvas ref={mountRef} width={500} height={400}></canvas>
            <div style={{ marginTop: "10px" }}>
                <button onClick={cerrarSegmento}>Cerrar Segmento</button>
                <button onClick={abrirSegmento}>Abrir Segmento</button>
            </div>
        </div>
    );
};

export default Model;
