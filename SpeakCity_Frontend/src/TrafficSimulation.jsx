import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";

import { Car } from "./Classes/Car";
import { TrafficLight } from "./Classes/TrafficLight";
import { preloadAssets } from "./Utils/preloadAssets";
import { 
  areRectanglesIntersecting, 
  drawStreets, 
  drawIntersections, 
  setComplex, 
  setNameStreets,
  drawPerimeterIntersections 
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

  const closeStreet = async (nameStreet = "H10", allStreets = allStreetsRef.current, closedStreets = closedStreetsRef.current) => {
    const streetToClose = allStreets.get(nameStreet);
    if (!streetToClose || closedStreets.has(nameStreet)) return;

    streetToClose.toggleClosed();
    closedStreets.set(nameStreet, true);
    console.log(`Calle ${nameStreet} cerrada.`);
  };

  const openStreet = (nameStreet = "H10", allStreets, closedStreets) => {
    if (closedStreets.has(nameStreet)) {
      const streetToOpen = allStreets.get(nameStreet);
      if (streetToOpen) {
        streetToOpen.toggleClosed();
        closedStreets.delete(nameStreet);
        console.log(`Calle ${nameStreet} reabierta.`);
      }
    }
  };

  useEffect(() => {
    const initPixiApp = async () => {
      await preloadAssets();

      const app = new PIXI.Application();
      await app.init({
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: 0x1099bb,
        antialias: true
      });
      
      pixiContainerRef.current.appendChild(app.view);
      appRef.current = app;

      const backgroundTexture = PIXI.Texture.from('grass_bg');
      const background = new PIXI.Sprite(backgroundTexture);
      background.width = app.screen.width;
      background.height = app.screen.height;
      app.stage.addChildAt(background, 0);

      const blockContainer = new PIXI.Container();
      const streetContainer = new PIXI.Container();
      const intersectionContainer = new PIXI.Container();
      const carsContainer = new PIXI.Container();
      app.stage.addChild(blockContainer);
      app.stage.addChild(streetContainer);
      app.stage.addChild(intersectionContainer);
      app.stage.addChild(carsContainer);

    };

    initPixiApp();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
      }
    };
  }, []);

  useEffect(() => {
    const initPixiApp = async () => {
        await preloadElements();
        
        const app = new PIXI.Application();
        await app.init({
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: 0x1099bb,
        antialias: true // Opcional para mejor renderizado
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
        
        app.stage.addChild(blockContainer);
        app.stage.addChild(streetContainer);
        app.stage.addChild(intersectionContainer);
        app.stage.addChild(carsContainer);

        
      drawStreets(streetContainer, allStreetsRef.current);
      drawIntersections(intersectionContainer, allIntersectionsRef.current);
      drawPerimeterIntersections(intersectionContainer, allIntersectionsRef.current);
      setNameStreets(allStreetsRef.current, labelContainer);

      // Asignar calles conectadas a las intersecciones
      for (let i = 1; i < hortBlocks; i++) {
        for (let j = 1; j < vertBlocks; j++) {
          const intersectionId = "I" + i + j;
          const intersection = allIntersectionsRef.current.get(intersectionId);
          if (intersection) {
            intersection.connectedStreets = {
              'top': allStreetsRef.current.get("V" + i + (j - 1)),
              'bottom': allStreetsRef.current.get("V" + i + j),
              'left': allStreetsRef.current.get("H" + i + (j - 1)),
              'right': allStreetsRef.current.get("H" + i + j)
            };
          }
        }
      }

      setComplex(blockContainer);

      function startSyncedCycle(topLight, bottomLight, leftLight, rightLight, greenTime = 6000) {
        // Fase inicial: vertical en verde
        topLight.setState('green');
        bottomLight.setState('green');
        leftLight.setState('red');
        rightLight.setState('red');

        setInterval(() => {
          // Fase horizontal verde
          topLight.setState('red');
          bottomLight.setState('red');
          leftLight.setState('green');
          rightLight.setState('green');

          setTimeout(() => {
            // Fase vertical verde
            topLight.setState('green');
            bottomLight.setState('green');
            leftLight.setState('red');
            rightLight.setState('red');
          }, greenTime);
        }, greenTime * 2);
      }

      // Crear semáforos para intersección
      const trafficLights = [];

      for (const [id, intersection] of allIntersectionsRef.current) {
        if (!["I22", "I21", "I12"].includes(id)) continue;
        
        // 4 lados por intersección
        const topLight = new TrafficLight(intersection, 'top', streetContainer);
        const bottomLight = new TrafficLight(intersection, 'bottom', streetContainer);
        const leftLight = new TrafficLight(intersection, 'left', streetContainer);
        const rightLight = new TrafficLight(intersection, 'right', streetContainer);

        trafficLights.push(topLight, bottomLight, leftLight, rightLight);
        startSyncedCycle(topLight, bottomLight, leftLight, rightLight, 6000);
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
          { x: 0, y: wHS * i - (halfWidthStreets / 2) },
          -1,
          1 + Math.random()
        );
        car1.scale.x *= -1;
        carsContainer.addChild(car1);
        cars.push(car1);

        // Carro 2: Se mueve hacia la izquierda en el carril inferior
        const car2 = new Car(
          texture2,
          false,
          { x: canvasWidth, y: wHS * i + (halfWidthStreets / 2) },
          1,
          1 + Math.random()
        );
        carsContainer.addChild(car2);
        cars.push(car2);
      }

      // Crear carros para calles verticales
      for (let i = 1; i < vertBlocks; i++) {
        const texture1 = PIXI.Assets.get('car' + (1 + Math.floor(Math.random() * 5)));
        const texture2 = PIXI.Assets.get('car' + (1 + Math.floor(Math.random() * 5)));

        // Carro 1: Se mueve hacia abajo en el carril izquierdo
        const car1 = new Car(
          texture1,
          true,
          { x: wVS * i - (halfWidthStreets / 2), y: 0 },
          1,
          1 + Math.random()
        );
        carsContainer.addChild(car1);
        cars.push(car1);

        // Carro 2: Se mueve hacia arriba en el carril derecho
        const car2 = new Car(
          texture2,
          true,
          { x: wVS * i + (halfWidthStreets / 2), y: canvasHeight },
          -1,
          1 + Math.random()
        );
        car2.scale.y *= -1;
        carsContainer.addChild(car2);
        cars.push(car2);
      }

      carsRef.current = cars;

      app.ticker.add((time) => {
        const deltaTime = time.deltaTime;

        // Mover todos los carros
        for (const car of carsRef.current) {
          car.update(deltaTime, app.screen);
        }

        // Detección de colisiones
        for (let i = 0; i < carsRef.current.length; i++) {
          const carA = carsRef.current[i];
          const carABounds = carA.getBounds();
          let carAFrontSensor;
          
          if (carA.isVertical) {
            if (carA.direction == 1) {
              carAFrontSensor = new PIXI.Rectangle(
                carABounds.x,
                carABounds.y + carABounds.height - carABounds.height/4,
                carABounds.width,
                carABounds.height/4
              );
            } else {
              carAFrontSensor = new PIXI.Rectangle(
                carABounds.x,
                carABounds.y,
                carABounds.width,
                carABounds.height/4
              );
            }
          } else {
            if (carA.direction == 1) {
              carAFrontSensor = new PIXI.Rectangle(
                carABounds.x + carABounds.width - carABounds.width/4,
                carABounds.y,
                carABounds.width / 4,
                carABounds.height
              );
            } else {
              carAFrontSensor = new PIXI.Rectangle(
                carABounds.x,
                carABounds.y,
                carABounds.width / 4,
                carABounds.height
              );
            }
          }

          let carANearIntersection = false;

          // Verificar intersecciones
          for (const [id, intersection] of allIntersectionsRef.current) {
            const intersectionBounds = new PIXI.Rectangle(
              intersection.dimensions[0],
              intersection.dimensions[1],
              intersection.dimensions[2],
              intersection.dimensions[3]
            );

            const intersectionBuffer = 20;
            const bufferedIntersectionBounds = new PIXI.Rectangle(
              intersection.dimensions[0] - intersectionBuffer,
              intersection.dimensions[1] - intersectionBuffer,
              intersection.dimensions[2] + 2 * intersectionBuffer,
              intersection.dimensions[3] + 2 * intersectionBuffer
            );

            if (areRectanglesIntersecting(carAFrontSensor, bufferedIntersectionBounds)) {
              carANearIntersection = true;
              let shouldCarAStop = false;

              for (let j = 0; j < carsRef.current.length; j++) {
                if (i === j) continue;

                const carB = carsRef.current[j];
                const carBBounds = carB.getBounds();

                if (areRectanglesIntersecting(carBBounds, intersectionBounds)) {
                  if (areRectanglesIntersecting(carAFrontSensor, intersectionBounds)){
                    if (carB.id < carA.id)
                      shouldCarAStop = true;
                  } else {
                    if (!carB.isStopped ) {
                      shouldCarAStop = true;
                    }
                  }
                  break;
                }
              }

              if (shouldCarAStop) {
                carA.stop();
              } else {
                carA.resume();
              }
              break;
            }
          }

          if (!carANearIntersection) {
            carA.resume();
          }

          // Verificar semáforos
          for (const light of trafficLights) {
            const stopZone = light.getStopZone();

            // Solo aplica si el auto va en la misma orientación que el semáforo
            const dir = light.direction;
            const isVerticalLight = (dir === 'top' || dir === 'bottom');
            const matchesDirection =
                (carA.isVertical && isVerticalLight) ||
                (!carA.isVertical && !isVerticalLight);

            if (!matchesDirection) continue;

            if (light.isRed()) {
              const carSensor = carA.getBounds();

              if (areRectanglesIntersecting(carSensor, stopZone)) {
                // Verificamos si el coche ya pasó la intersección
                const [ix, iy, iw, ih] = light.intersection.dimensions;
                const carCenter = {
                  x: carSensor.x + carSensor.width / 2,
                  y: carSensor.y + carSensor.height / 2
                };

                let shouldStop = false;

                if (carA.isVertical) {
                  if (carA.direction === 1 && carCenter.y < iy) {
                    shouldStop = true; // Va hacia abajo y aún no entra
                  }
                  if (carA.direction === -1 && carCenter.y > iy + ih) {
                    shouldStop = true; // Va hacia arriba y aún no entra
                  }
                } else {
                  if (carA.direction === 1 && carCenter.x < ix) {
                    shouldStop = true; // Va hacia la derecha y aún no entra
                  }
                  if (carA.direction === -1 && carCenter.x > ix + iw) {
                    shouldStop = true; // Va hacia la izquierda y aún no entra
                  }
                }

                if (shouldStop) {
                  carA.stop();
                  break;
                }
              }
            }
          }

          // Verificación por calle cerrada
          for (const [streetId] of closedStreetsRef.current) {
            const closedStreet = allStreetsRef.current.get(streetId);
            if (!closedStreet) continue;

            const stopMargin = 20;
            let stopZone;

            if (closedStreet.orientation === 'horizontal') {
              if (carA.direction === 1) {
                stopZone = new PIXI.Rectangle(
                  closedStreet.dimensions[0] - stopMargin,
                  closedStreet.dimensions[1],
                  stopMargin,
                  closedStreet.dimensions[3]
                );
              } else {
                stopZone = new PIXI.Rectangle(
                  closedStreet.dimensions[0] + closedStreet.dimensions[2],
                  closedStreet.dimensions[1],
                  stopMargin,
                  closedStreet.dimensions[3]
                );
              }
            } else {
              if (carA.direction === 1) {
                stopZone = new PIXI.Rectangle(
                  closedStreet.dimensions[0],
                  closedStreet.dimensions[1] - stopMargin,
                  closedStreet.dimensions[2],
                  stopMargin
                );
              } else {
                stopZone = new PIXI.Rectangle(
                  closedStreet.dimensions[0],
                  closedStreet.dimensions[1] + closedStreet.dimensions[3],
                  closedStreet.dimensions[2],
                  stopMargin
                );
              }
            }

            if (closedStreet.orientation === 'horizontal' && !carA.isVertical) {
              if (areRectanglesIntersecting(carAFrontSensor, stopZone)) {
                carA.stop();
                break;
              }
            }
            if (closedStreet.orientation === 'vertical' && carA.isVertical) {
              if (areRectanglesIntersecting(carAFrontSensor, stopZone)) {
                carA.stop();
                break;
              }
            }
          }
        }
      });
    };

    initPixiApp();

    setTrafficAPI({ closeStreet, openStreet });
    
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