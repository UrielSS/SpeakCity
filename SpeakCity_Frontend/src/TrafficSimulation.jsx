import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { Car } from "./classes/Car";
import { TrafficLight } from "./Classes/TrafficLight";
import { preloadAssets } from "./Utils/preloadAssets";
import { 
  areRectanglesIntersecting, 
  drawStreets, 
  drawIntersections,
  setComplex, 
  setNameStreets 
} from "./utils/utils";
import { CANVAS_CONFIG, CALCULATED_VALUES } from "./utils/constants";

  const TrafficSimulation = ({ setTrafficAPI, setCloseStreets, setOpenStreets, setNumCars }) => {

  const { width: canvasWidth, height: canvasHeight, hortBlocks, vertBlocks, halfWidthStreets } = CANVAS_CONFIG;
  const { wVS, wHS } = CALCULATED_VALUES;

  const pixiContainerRef = useRef(null);
  const appRef = useRef(null);
  const carsRef = useRef([]);
  const allStreetsRef = useRef(new Map());
  const allIntersectionsRef = useRef(new Map());
  const closedStreetsRef = useRef(new Map());
  const trafficLights = [];
  const trafficLights_deactivated = [];

  const closeStreet = async (nameStreet = "H10", allStreets = allStreetsRef.current, closedStreets = closedStreetsRef.current) => {
    const streetToClose = allStreets.get(nameStreet);
    if (!streetToClose || closedStreets.has(nameStreet)) return;

    streetToClose.toggleClosed();
    closedStreets.set(nameStreet, true);
    console.log(`Calle ${nameStreet} cerrada.`);
  };

  const openStreet = (nameStreet = "H10", allStreets = allStreetsRef.current, closedStreets = closedStreetsRef.current) => {
    if (closedStreets.has(nameStreet)) {
      const streetToOpen = allStreets.get(nameStreet);
      if (streetToOpen) {
        streetToOpen.toggleClosed();
        closedStreets.delete(nameStreet);
        console.log(`Calle ${nameStreet} reabierta.`);
      }
    }
  };

  const changeTrafficLight_red = (nameTrafficLight) => {
    let trafficLightModify = getObjectTrafficLight(nameTrafficLight, trafficLights);
    trafficLightModify.setState('red');
    trafficLightModify.stopTimer();
  };

  const changeTrafficLight_green = (nameTrafficLight) => {
    let trafficLightModify = getObjectTrafficLight(nameTrafficLight, trafficLights);
    trafficLightModify.setState('green');
    trafficLightModify.stopTimer();
  };

  const deactivateTrafficLight = (nameTrafficLight) => {
    let trafficLightModify = getObjectTrafficLight(nameTrafficLight, trafficLights);
    const index = trafficLights.indexOf(trafficLightModify);
    if (index !== -1) {
      trafficLights.splice(index, 1);
      trafficLights_deactivated.push(trafficLightModify);
      trafficLightModify.deactivate();
    }
  };

  const activateTrafficLight = (nameTrafficLight) => {
    let trafficLightModify = getObjectTrafficLight(nameTrafficLight, trafficLights_deactivated);
    const index = trafficLights_deactivated.indexOf(trafficLightModify);
    if (index !== -1) {
      trafficLights_deactivated.splice(index, 1);
      trafficLights.push(trafficLightModify);
      trafficLightModify.activate();
    }
  };

  const changeTrafficLightTimeInterval = (nameTrafficLight, durationChangeSeconds) => {
    let trafficLightModify = getObjectTrafficLight(nameTrafficLight, trafficLights);
    if (trafficLightModify !== null) {
      trafficLightModify.startTimer(durationChangeSeconds * 1000);
    }
  }

  const getObjectTrafficLight = (nameTrafficLight, arrayTrafficLigths) => {
    let arrayName = nameTrafficLight.split(" ");
    let intersection = arrayName[0];
    let direction = arrayName[1];

    let trafficLightModify = null;
    for(let i=0; i < arrayTrafficLigths.length; i++) {
      let trafficLight = arrayTrafficLigths[i];
      if (trafficLight.direction.toUpperCase() == direction && trafficLight.intersection.id == intersection) {
        trafficLightModify = trafficLight;
        break
      }
    }
    return trafficLightModify;
  };

  


  useEffect(() => {
    //Función para decidir la dirección del coche
    function decideNextStreet(car, intersection, closedStreetsRef) {
      const possibleDirections = [];

      const { top, bottom, left, right } = intersection.connectedStreets;

      // Solo agrega calles que existen y no están cerradas
      if (top && !closedStreetsRef.current.has(top.id)) possibleDirections.push(top);
      if (bottom && !closedStreetsRef.current.has(bottom.id)) possibleDirections.push(bottom);
      if (left && !closedStreetsRef.current.has(left.id)) possibleDirections.push(left);
      if (right && !closedStreetsRef.current.has(right.id)) possibleDirections.push(right);

      // Elimina la calle actual para evitar volver atrás
      const filtered = possibleDirections.filter(s => s !== car.currentStreet);

      if (filtered.length === 0) return car.currentStreet; // Si no hay otra opción, seguir

      // Elegir una calle al azar
      const nextStreet = filtered[Math.floor(Math.random() * filtered.length)];
      return nextStreet;
    }

    // Función para obtener el sensor frontal del coche
      const getFrontSensor = (car) => {
      const b = car.getBounds();
      if (car.isVertical) {
        if (car.direction === 1) {
          return new PIXI.Rectangle(b.x, b.y + b.height - b.height/4, b.width, b.height/4);
        } else {
          return new PIXI.Rectangle(b.x, b.y, b.width, b.height/4);
        }
      } else {
        if (car.direction === 1) {
          return new PIXI.Rectangle(b.x + b.width - b.width/4, b.y, b.width/4, b.height);
        } else {
          return new PIXI.Rectangle(b.x, b.y, b.width/4, b.height);
        }
      }
    };


    // FUNCIÓN GENERAL DE STOP
    const shouldCarStop = (car) => {
      const carFront = getFrontSensor(car);

      // 1) Semáforos en rojo (misma orientación)
      for (const light of trafficLights) {
        const dir = light.direction;
        const verticalLight = (dir === 'top' || dir === 'bottom');
        const matches = (car.isVertical && verticalLight) || (!car.isVertical && !verticalLight);
        if (!matches) continue;

        if (light.isRed()) {
          const stopZone = light.getStopZone();
          if (areRectanglesIntersecting(car.getBounds(), stopZone)) {
            // Aún no entra al rectángulo de la intersección
            const [ix, iy, iw, ih] = light.intersection.dimensions;
            const b = car.getBounds();
            const cx = b.x + b.width/2;
            const cy = b.y + b.height/2;

            if (car.isVertical) {
              if ((car.direction === 1 && cy < iy) || (car.direction === -1 && cy > iy + ih)) {
                return { stop: true, reason: 'red_light' };
              }
            } else {
              if ((car.direction === 1 && cx < ix) || (car.direction === -1 && cx > ix + iw)) {
                return { stop: true, reason: 'red_light' };
              }
            }
          }
        }
      }

      // 2) Calle cerrada por delante (misma orientación)
      for (const [streetId] of closedStreetsRef.current) {
        const cs = allStreetsRef.current.get(streetId);
        if (!cs) continue;

        const stopMargin = 20;
        let stopZone;

        if (cs.orientation === 'horizontal') {
          if (car.direction === 1) {
            stopZone = new PIXI.Rectangle(cs.dimensions[0] - stopMargin, cs.dimensions[1], stopMargin, cs.dimensions[3]);
          } else {
            stopZone = new PIXI.Rectangle(cs.dimensions[0] + cs.dimensions[2], cs.dimensions[1], stopMargin, cs.dimensions[3]);
          }
          if (!car.isVertical && areRectanglesIntersecting(carFront, stopZone)) {
            return { stop: true, reason: 'closed_street' };
          }
        } else {
          if (car.direction === 1) {
            stopZone = new PIXI.Rectangle(cs.dimensions[0], cs.dimensions[1] - stopMargin, cs.dimensions[2], stopMargin);
          } else {
            stopZone = new PIXI.Rectangle(cs.dimensions[0], cs.dimensions[1] + cs.dimensions[3], cs.dimensions[2], stopMargin);
          }
          if (car.isVertical && areRectanglesIntersecting(carFront, stopZone)) {
            return { stop: true, reason: 'closed_street' };
          }
        }
      }

      // 3) Intersección ocupada (si hay algún coche dentro y yo estoy por entrar)
      for (const [, inter] of allIntersectionsRef.current) {
        const ib = new PIXI.Rectangle(inter.dimensions[0], inter.dimensions[1], inter.dimensions[2], inter.dimensions[3]);

        // buffer para “casi llegando”
        const buffer = 20;
        const ibuf = new PIXI.Rectangle(
          inter.dimensions[0] - buffer,
          inter.dimensions[1] - buffer,
          inter.dimensions[2] + 2*buffer,
          inter.dimensions[3] + 2*buffer
        );

        if (!areRectanglesIntersecting(carFront, ibuf)) continue;

        // ¿hay coches dentro?
        let someoneInside = false;
        for (let j = 0; j < carsRef.current.length; j++) {
          const other = carsRef.current[j];
          if (other === car) continue;
          if (areRectanglesIntersecting(other.getBounds(), ib)) {
            someoneInside = true;
            break;
          }
        }

        if (someoneInside) {
          // Si yo además estoy tocando ya el rect de intersección y el otro tiene menor id,
          // me detengo (prioridad simple para evitar empates visuales).
          if (areRectanglesIntersecting(carFront, ib)) {
            // Mantengo tu prioridad por id para casos al ras
            for (let j = 0; j < carsRef.current.length; j++) {
              const other = carsRef.current[j];
              if (other === car) continue;
              if (areRectanglesIntersecting(other.getBounds(), ib) && other.id < car.id) {
                return { stop: true, reason: 'intersection_busy' };
              }
            }
          }
          // Cerca de la intersección y alguien adentro: alto
          return { stop: true, reason: 'intersection_busy' };
        }
      }

      return { stop: false, reason: null };
    };

    const initPixiApp = async () => {
      await preloadAssets(); // ¡AQUÍ ESTABA EL ERROR! Llamabas preloadElements() en lugar de preloadAssets()

      const app = new PIXI.Application();
      await app.init({
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: 0x1099bb,
        antialias: true
      });
      
      pixiContainerRef.current.appendChild(app.canvas);
      appRef.current = app;

      // Resto de tu código de inicialización...
      const backgroundTexture = PIXI.Texture.from('grass_bg');
      const background = new PIXI.Sprite(backgroundTexture);
      background.width = app.screen.width;
      background.height = app.screen.height;
      app.stage.addChildAt(background, 0);

      const blockContainer = new PIXI.Container();
      const streetContainer = new PIXI.Container();
      const intersectionContainer = new PIXI.Container();
      const carsContainer = new PIXI.Container();
      const labelContainer = new PIXI.Container();

      app.stage.addChild(blockContainer);
      app.stage.addChild(streetContainer);
      app.stage.addChild(intersectionContainer);
      app.stage.addChild(carsContainer);
      app.stage.addChild(labelContainer);

      drawStreets(streetContainer, allStreetsRef.current);
      drawIntersections(intersectionContainer, allIntersectionsRef.current);
      setNameStreets(allStreetsRef.current, labelContainer);

      // Asignar calles conectadas a las intersecciones
      for (let i = 0; i <= hortBlocks; i++) {
        for (let j = 0; j <= vertBlocks; j++) {
          const intersectionId = "I" + i + j;
          const intersection = allIntersectionsRef.current.get(intersectionId);
          if (intersection) {
            intersection.connectedStreets = {
              'top': allStreetsRef.current.get("V" + j + (i - 1)),
              'bottom': allStreetsRef.current.get("V" + j + i),
              'left': allStreetsRef.current.get("H" + i + (j - 1)),
              'right': allStreetsRef.current.get("H" + i + j)
            };
          }
          console.log(intersection);
        }
      }

      setComplex(blockContainer);

      for (const [id, intersection] of allIntersectionsRef.current) {
        if (!["I22", "I21", "I12"].includes(id)) continue;
        
        // 4 lados por intersección
        const topLight = new TrafficLight(intersection, 'top', streetContainer);
        const bottomLight = new TrafficLight(intersection, 'bottom', streetContainer);
        const leftLight = new TrafficLight(intersection, 'left', streetContainer);
        const rightLight = new TrafficLight(intersection, 'right', streetContainer);

        trafficLights.push(topLight, bottomLight, leftLight, rightLight);

        const semaforos = [
          { light: topLight, initial: 'green' },
          { light: bottomLight, initial: 'green' },
          { light: leftLight, initial: 'red' },
          { light: rightLight, initial: 'red' }
        ];

        for (const { light, initial } of semaforos) {
          light.setState(initial);
          light.startTimer();
        }
      }

      // Creación de carros
      const cars = [];
      for (let i = 1; i < hortBlocks; i++) {
        const texture1 = PIXI.Assets.get('car' + (1 + Math.floor(Math.random() * 5)));
        const texture2 = PIXI.Assets.get('car' + (1 + Math.floor(Math.random() * 5)));

        // Carro 1: Se mueve hacia la derecha en el carril superior
        const car1 = new Car(
          texture1,
          false,
          { x: 0, y: wHS * i + halfWidthStreets / 2 },
          1,
          Math.random()*1.5 +0.5
        );
        //Asignación de calle inicial
        car1.currentStreet = allStreetsRef.current.get("H"+ i + "0");
        car1.nextStreet = car1.currentStreet;
        //console.log("H"+ i + "0 " + car1.currentStreet+ "   next: " + car1.nextStreet);
        carsContainer.addChild(car1);
        cars.push(car1);

        // Carro 2: Se mueve hacia la izquierda en el carril inferior
        const car2 = new Car(
          texture2,
          false,
          { x: canvasWidth, y: wHS * i + halfWidthStreets + halfWidthStreets/2 },
          -1,
          Math.random()*1.5
        );
        //Asignación de calle inicial
        car2.currentStreet = allStreetsRef.current.get("H"+ i + (hortBlocks-1));
        car2.nextStreet = car2.currentStreet;
        //console.log("H"+ i + "3 " + car2.currentStreet+ "   next: " + car2.nextStreet);
        
        car2.scale.x *= -1;
        carsContainer.addChild(car2);
        cars.push(car2);
      }

      // Crear carros para calles verticales
      for (let i = 1; i < vertBlocks; i++) { //vertBlocks
        const texture1 = PIXI.Assets.get('car' + (1 + Math.floor(Math.random() * 5)));
        const texture2 = PIXI.Assets.get('car' + (1 + Math.floor(Math.random() * 5)));

        // Carro 1: Se mueve hacia abajo en el carril izquierdo
        const car1 = new Car(
          texture1,
          true,
          { x: wVS * i + halfWidthStreets + halfWidthStreets/2, y: 0 },
          1,
          1 + Math.random()*1.2
        );
        //Asignación de calle inicial
        car1.currentStreet = allStreetsRef.current.get("V"+ i + "0");
        car1.nextStreet = car1.currentStreet;
        //console.log("V"+ i + "0  " + car1.currentStreet+ "   next: " + car1.nextStreet);
        
        carsContainer.addChild(car1);
        cars.push(car1);

        // Carro 2: Se mueve hacia arriba en el carril derecho
        const car2 = new Car(
          texture2,
          true,
          { x: wVS * i + halfWidthStreets - halfWidthStreets/2, y: canvasHeight },
          -1,
          1 + Math.random()
        );
        //Asignación de calle inicial
        car2.currentStreet = allStreetsRef.current.get("V"+ i + (vertBlocks-1));
        car2.nextStreet = car2.currentStreet;
        //console.log("V"+ i + "3 " + car2.currentStreet+ "   next: " + car2.nextStreet);
        
        car2.scale.y *= -1;
        carsContainer.addChild(car2);
        cars.push(car2);
      }

      carsRef.current = cars;

      // Configurar el game loop
      app.ticker.add((time) => {
         const deltaTime = time.deltaTime;

        for (let i = 0; i < carsRef.current.length; i++) {
          const car = carsRef.current[i];

          // ÚNICA decisión consolidada
          const verdict = shouldCarStop(car);
          if (verdict.stop) {
            car.stop();
          } else {
            car.resume();
          }

          // Movimiento final (considera además su frenado por proximidad)
          car.update(deltaTime, app.screen);

          // Cambio de calle dentro de intersección (tu lógica existente)
          let isInIntersection = false;
          for (const [, intersection] of allIntersectionsRef.current) {
            const ib = new PIXI.Rectangle(
              intersection.dimensions[0] - 2,
              intersection.dimensions[1] - 2,
              intersection.dimensions[2] + 4,
              intersection.dimensions[3] + 4
            );
            if (areRectanglesIntersecting(car.getBounds(), ib)) {
              isInIntersection = true;

              if (!car.hasChangedDirection) {
                let ns = decideNextStreet(car, intersection, closedStreetsRef);
                if (closedStreetsRef.current.get(ns.id)) {
                  ns = decideNextStreet(car, intersection, closedStreetsRef);
                }

                if (ns !== car.currentStreet) {
                  car.nextStreet = ns;
                  car.setDirectionBasedOnStreet(ns);
                  car.hasChangedDirection = true;
                } else {
                  car.nextStreet = car.currentStreet;
                  car.setDirectionBasedOnStreet(car.currentStreet);
                }
              }
              break;
            }
          }
          if (!isInIntersection && car.hasChangedDirection && car.nextStreet) {
            car.currentStreet = car.nextStreet;
            car.hasChangedDirection = false;
          }
        }
      });
    };

    initPixiApp();

    setTrafficAPI({ closeStreet, openStreet, changeTrafficLight_red, changeTrafficLight_green,
                    deactivateTrafficLight, activateTrafficLight, changeTrafficLightTimeInterval });
    
    const interval = setInterval(() => {
      // Número de carros
      const currentNumCars = carsRef.current.length;
      setNumCars(currentNumCars);

      // Número de calles cerradas
      const closed = closedStreetsRef.current.size;
      setCloseStreets(closed);

      // Número de calles abiertas
      const total = allStreetsRef.current.size;
      const opened = total - closed;
      setOpenStreets(opened);
    }, 500);

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
      }
      clearInterval(interval);
    };
  }, []);

  return <div ref={pixiContainerRef} />;
};

export default TrafficSimulation;