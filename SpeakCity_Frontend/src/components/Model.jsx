import React, { useRef, useEffect } from "react";
import * as THREE from 'three';

const Model = () => {
    const mountRef = useRef(null);
    //Constantes del número de calles
    const numVertStreets = 4;
    const numHorStreets = 3;
    
    
    useEffect(()=>{
        //Referencia al canvas del mapa
        const canvas = mountRef.current;
        const ctx = canvas.getContext("2d");

        //Obtención de coordenadas de las calles
        const wVS = Math.floor(canvas.width / numVertStreets);
        const wHS = Math.floor(canvas.height / numHorStreets);

        // Ancho de las calles
        ctx.lineWidth = 10;

        //Dibujo de las calles verticales
        for (var i = 1; i < numVertStreets; i++ ){
            ctx.beginPath();

            // Set a start-point
            ctx.moveTo(wVS*i,0);

            // Set an end-point
            ctx.lineTo(wVS*i,canvas.height);

            // Draw it
            ctx.stroke();
        }

        //Dibujo de calles horizontales
        for (var i = 1; i < numHorStreets; i++ ){
            ctx.beginPath();

            // Set a start-point
            ctx.moveTo(0,wHS*i);

            // Set an end-point
            ctx.lineTo(canvas.width,wHS*i);

            // Draw it
            ctx.stroke();
        }

        //Almacenar intersecciones?
        //Definir sentidos?


    }, []);
    return (
        <canvas ref= {mountRef} width= {500} height= {400}></canvas>
    )
};

export default Model;