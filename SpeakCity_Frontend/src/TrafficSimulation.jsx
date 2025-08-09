import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { Car } from "./classes/Car";
import { TrafficLight } from "./Classes/TrafficLight";
import { preloadAssets } from "./Utils/preloadAssets";
import { 
  areRectanglesIntersecting, 
  drawStreets, 
  drawIntersections, 
  drawPerimeterIntersections,
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
      if (top && !closedStreetsRef.current.has(top.name)) possibleDirections.push(top);
      if (bottom && !closedStreetsRef.current.has(bottom.name)) possibleDirections.push(bottom);
      if (left && !closedStreetsRef.current.has(left.name)) possibleDirections.push(left);
      if (right && !closedStreetsRef.current.has(right.name)) possibleDirections.push(right);

      // Elimina la calle actual para evitar volver atrás
      const filtered = possibleDirections.filter(s => s !== car.currentStreet);

      if (filtered.length === 0) return car.currentStreet; // Si no hay otra opción, seguir

      // Elegir una calle al azar
      const nextStreet = filtered[Math.floor(Math.random() * filtered.length)];
      return nextStreet;
    }

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
          { x: 0, y: wHS * i - (halfWidthStreets / 2) },
          1,
          1 + Math.random()
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
          { x: canvasWidth, y: wHS * i + (halfWidthStreets / 2) },
          -1,
          1 + Math.random()
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
          { x: wVS * i - (halfWidthStreets / 2), y: 0 },
          1,
          1 + Math.random()
        );
        //Asignación de calle inicial
        car1.currentStreet = allStreetsRef.current.get("V"+ i + "0");
        car1.nextStreet = car1.currentStreet;
        console.log("V"+ i + "0  " + car1.currentStreet+ "   next: " + car1.nextStreet);
        
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
        //Asignación de calle inicial
        car2.currentStreet = allStreetsRef.current.get("V"+ i + (vertBlocks-1));
        car2.nextStreet = car2.currentStreet;
        console.log("V"+ i + "3 " + car2.currentStreet+ "   next: " + car2.nextStreet);
        
        car2.scale.y *= -1;
        carsContainer.addChild(car2);
        cars.push(car2);
      }

      carsRef.current = cars;

      // Configurar el game loop
      app.ticker.add((time) => {
        const deltaTime = time.deltaTime;

        // Mover todos los carros
        // for (const car of carsRef.current) {
        //   car.update(deltaTime, app.screen);
        // }

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

          // Lógica de cambio de calle/intersección
          let isInIntersection = false;

          //
          for (const [id, intersection] of allIntersectionsRef.current) {
            const intersectionBounds = new PIXI.Rectangle(
              intersection.dimensions[0]- 2,
              intersection.dimensions[1] - 2,
              intersection.dimensions[2] + 4,
              intersection.dimensions[3] + 4
            );

            if (areRectanglesIntersecting(carA.getBounds(), intersectionBounds)) {
              isInIntersection = true;

              if (!carA.hasChangedDirection) {
                let nextStreet = decideNextStreet(carA, intersection, closedStreetsRef);

                if (closedStreetsRef.current.get(nextStreet.id)) {
                  // Reintentar si la primera opción está cerrada
                  nextStreet = decideNextStreet(carA, intersection, closedStreetsRef);
                }

                if (/*nextStreet && */nextStreet !== carA.currentStreet) {
                  carA.nextStreet = nextStreet;
                  carA.setDirectionBasedOnStreet(nextStreet);
                  carA.hasChangedDirection = true;
                } else {
                  // Si no hay otra calle, seguir en la actual
                  carA.nextStreet = carA.currentStreet;
                  carA.setDirectionBasedOnStreet(carA.currentStreet);
                }
              }
              break;
            }
          }

          if (!isInIntersection && carA.hasChangedDirection && carA.nextStreet) {
            carA.currentStreet = carA.nextStreet;
            carA.hasChangedDirection = false;
          }

          //Al final, actualiza la posición del coche según las decisiones tomadas a partir de los elementos del mapa
          carA.update(deltaTime, app.screen);
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