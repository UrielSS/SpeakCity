import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { Car } from "./classes/Car";
import { TrafficLight } from "./classes/TrafficLight";
import { preloadAssets } from "./utils/preloadAssets";
import { 
  areRectanglesIntersecting, 
  drawStreets, 
  drawIntersections,
  setComplex, 
  setNameStreets,
  setNameIntersections
} from "./utils/utils";
import { CANVAS_CONFIG, CALCULATED_VALUES, EXCLUDED_STREETS} from "./utils/constants";

  const TrafficSimulation = ({ setTrafficAPI, setCloseStreets, setOpenStreets, setNumCars, setSemaforosHabilit, setSemaforosInhabilit}) => {

  const { width: canvasWidth, height: canvasHeight, hortBlocks, vertBlocks, halfWidthStreets } = CANVAS_CONFIG;
  const { wVS, wHS } = CALCULATED_VALUES;

  const excludedStreets = EXCLUDED_STREETS;

  const pixiContainerRef = useRef(null);
  const appRef = useRef(null);
  const carsRef = useRef([]);
  const allStreetsRef = useRef(new Map());
  const allIntersectionsRef = useRef(new Map());
  const closedStreetsRef = useRef(new Map());
  const trafficLights = [];
  const trafficLights_deactivated = [];
  const carsPerStreet = 2;

  // Init Traffic Lights Default
  const trafficLights_intersectionInit = ["I22", "I21"];


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

  // Función para obtener todas las calles cerradas
const getClosedStreets = (closedStreets = closedStreetsRef.current) => {
  const closedStreetsList = [];
  for (const [streetName, isClosed] of closedStreets) {
    if (isClosed && !excludedStreets.has(streetName)) {
      closedStreetsList.push(streetName);
    }
  }
  return closedStreetsList;
};

// Función para abrir todas las calles cerradas
const openAllStreets = (allStreets = allStreetsRef.current, closedStreets = closedStreetsRef.current) => {
  const closedStreetsList = getClosedStreets(closedStreets);
  
  if (closedStreetsList.length === 0) {
    console.log("No hay calles cerradas para abrir.");
    return {
      success: true,
      message: "No hay calles cerradas",
      streetsOpened: []
    };
  }

  const streetsOpened = [];
  
  for (const streetName of closedStreetsList) {
    const streetToOpen = allStreets.get(streetName);
    if (streetToOpen && closedStreets.has(streetName)) {
      streetToOpen.toggleClosed();
      closedStreets.delete(streetName);
      streetsOpened.push(streetName);
      // console.log(`Calle ${streetName} reabierta.`);
    }
  }
  
  // console.log(`Se reabrieron ${streetsOpened.length} calles: ${streetsOpened.join(', ')}`);
  
  return {
    success: true,
    message: `Se reabrieron ${streetsOpened.length} calles`,
    streetsOpened: streetsOpened
  };
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
      setSemaforosHabilit(trafficLights.length);
      setSemaforosInhabilit(trafficLights_deactivated.length);
    }
  };

  const activateTrafficLight = (nameTrafficLight) => {
    let trafficLightModify = getObjectTrafficLight(nameTrafficLight, trafficLights_deactivated);
    const index = trafficLights_deactivated.indexOf(trafficLightModify);
    if (index !== -1) {
      let arrayNameIntersection = nameTrafficLight.split(' ');
      let nameIntersection = arrayNameIntersection[0];
      let nameDirection = arrayNameIntersection[1].toLowerCase();
      for (let [key, objectIntersection] of allIntersectionsRef.current) {
        if (nameIntersection == key) {
          let objectConnectedStreets = objectIntersection.connectedStreets;
          let objectStreet = objectConnectedStreets[nameDirection];
          if (objectStreet == null) {
            return;
          }
        }
      }

      if (nameDirection == 'top' ||  nameDirection == 'bottom') {
        trafficLightModify.setState('green');
      }
      else if (nameDirection == 'left' ||  nameDirection == 'right') {
        trafficLightModify.setState('red');
      }

      trafficLights_deactivated.splice(index, 1);
      trafficLights.push(trafficLightModify);
      trafficLightModify.activate();
      setSemaforosHabilit(trafficLights.length);
      setSemaforosInhabilit(trafficLights_deactivated.length);
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

  //funcion de carros por calle (por agregar a backend)
  const changeDensity = (density) =>{
    var total = 0;
    switch(density){
      case 0:
        total = 1;
        break;
      case 1:
        total = 2;
        break;
      case 2:
        total = 3;
        break;
      default:
        total = 1;
        break;
    }
    return total;
  };

  // Nueva función para manejar la detección de colisiones entre coches
  const handleCarToCarCollisions = (cars) => {
    for (let i = 0; i < cars.length; i++) {
      const carA = cars[i];
      let shouldStopForTraffic = false;
      let closestDistance = Infinity;

      // Resetear estado de parada por tráfico
      if (carA.isStoppedByTraffic) {
        carA.resumeFromTraffic();
      }

      // Verificar colisiones con otros coches
      for (let j = 0; j < cars.length; j++) {
        if (i === j) continue;
        
        const carB = cars[j];

        // Verificar si el coche B está en el mismo carril y adelante
        if (carA.isCarInSameLaneAhead(carB)) {
          const distance = carA.getDistanceToCarAhead(carB);
          
          // Si la distancia es positiva y menor que la distancia de detección
          //Esto significa que el coche B está adelante en el mismo carril
          if (distance > 0 && distance < carA.detectionDistance) {
            // Si el coche de adelante está parado o muy cerca, detenerse
            if (carB.isStopped || distance < carA.minFollowDistance) {
              shouldStopForTraffic = true;
              closestDistance = Math.min(closestDistance, distance);
              break;
            }
          }
        }
      }

      // Aplicar parada por tráfico si es necesario
      if (shouldStopForTraffic) {
        carA.stopByTraffic();
      }
    }
  };

  /*
  //funcion de carros por calle (por agregar a backend)
  function carsGenerated(density){
    var total = 0;
    switch(density){
      case 0:
        total = 1;
        break;
      case 1:
        total = 2;
        break;
      case 2:
        total = 3;
        break;
      default:
        total = 1;
        break;
    }
    return total;
  };*/


  useEffect(() => {
    //Función para decidir la dirección del coche
    function decideNextStreet(car, intersection, closedStreetsRef) {
      //console.log(`Decidiendo para coche ${car.id} en intersección ${intersection.id}`);
      //console.log(`Calle actual del coche:`, car.currentStreet ? car.currentStreet.id : 'NULL');

      const possibleDirections = [];
      const { top, bottom, left, right } = intersection.connectedStreets;

      // Log de calles conectadas
      // console.log('Calles conectadas a la intersección:', {
      //   top: top ? top.id : 'NULL',
      //   bottom: bottom ? bottom.id : 'NULL',
      //   left: left ? left.id : 'NULL',
      //   right: right ? right.id : 'NULL'
      // });

      const filterStreet = (street) => {
        if (!street) {
          return false;
        }
        const isExcluded = excludedStreets.has(street.id);
        const isClosed = closedStreetsRef.current.has(street.id);

        //console.log(`Evaluando calle ${street.id}: excluida=${isExcluded}, cerrada=${isClosed}`);

        return !isExcluded && !isClosed;
      };

      if (filterStreet(top)) possibleDirections.push(top);
      if (filterStreet(bottom)) possibleDirections.push(bottom);
      if (filterStreet(left)) possibleDirections.push(left);
      if (filterStreet(right)) possibleDirections.push(right);

      //console.log('Direcciones posibles:', possibleDirections.map(s => s.id));

      // Elimina la calle actual para evitar volver atrás
      const filtered = possibleDirections.filter(s => s !== car.currentStreet);

      //console.log('Direcciones después de filtrar calle actual:', filtered.map(s => s.id));

      // Si no hay opciones, intentar quedarse en la calle actual si es válida
      if (filtered.length === 0) {
        //console.log('No hay opciones disponibles');
        // Si la calle actual es válida, seguir en ella
        if (car.currentStreet && !excludedStreets.has(car.currentStreet.id) &&
          !closedStreetsRef.current.has(car.currentStreet.id)) {
          //console.log('Manteniéndose en calle actual:', car.currentStreet.id);
          return car.currentStreet;
        }
        // Si no hay opciones válidas retorno null
        //console.log('Retornando NULL - coche atrapado');
        return null;
      }

      // Elegir una calle al azar
      const nextStreet = filtered[Math.floor(Math.random() * filtered.length)];
      //console.log('Calle elegida:', nextStreet.id);
      return nextStreet;
    }

    // Verifico que calles están en excludedStreets:
    //console.log('Calles excluidas:', Array.from(excludedStreets));

    // Verifica que calles se están creando realmente:
    //console.log('Calles creadas:', Array.from(allStreetsRef.current.keys()));

    const initPixiApp = async () => {
      await preloadAssets();

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
      setNameIntersections(allIntersectionsRef.current, labelContainer);

      // Asignar calles conectadas a las intersecciones
      for (let i = 0; i <= hortBlocks; i++) {
        for (let j = 0; j <= vertBlocks; j++) {
          const intersectionId = "I" + i + j;
          const intersection = allIntersectionsRef.current.get(intersectionId);
          if (intersection) {
            intersection.connectedStreets = {
              //Solo asigno calles que no están excluidas
              'top': excludedStreets.has("V" + j + (i - 1)) ? null : allStreetsRef.current.get("V" + j + (i - 1)),
              'bottom': excludedStreets.has("V" + j + i) ? null : allStreetsRef.current.get("V" + j + i),
              'left': excludedStreets.has("H" + i + (j - 1)) ? null : allStreetsRef.current.get("H" + i + (j - 1)),
              'right': excludedStreets.has("H" + i + j) ? null : allStreetsRef.current.get("H" + i + j)
            };
          }
          //console.log(intersection);
        }
      }

      // Asignar calles a las referencias
      excludedStreets.forEach(streetId => {
        closedStreetsRef.current.set(streetId, true);
      });

      setComplex(blockContainer);

      for (const [id, intersection] of allIntersectionsRef.current) {

        // 4 lados por intersección
        const topLight = new TrafficLight(intersection, 'top', streetContainer);
        const bottomLight = new TrafficLight(intersection, 'bottom', streetContainer);
        const leftLight = new TrafficLight(intersection, 'left', streetContainer);
        const rightLight = new TrafficLight(intersection, 'right', streetContainer);

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

        if (trafficLights_intersectionInit.includes(id)) { // Add to Traffic Lights Activated
          let objectConnectedStreets = intersection.connectedStreets;
          // Top
          if (objectConnectedStreets['top'] != null) {
            trafficLights.push(topLight);
          }
          else {
            topLight.deactivate();
            trafficLights_deactivated.push(topLight);  
          }

          // Bottom
          if (objectConnectedStreets['bottom'] != null) {
            trafficLights.push(bottomLight);
          }
          else {
            bottomLight.deactivate();
            trafficLights_deactivated.push(bottomLight);  
          }

          // Left
          if (objectConnectedStreets['left'] != null) {
            trafficLights.push(leftLight);
          }
          else {
            leftLight.deactivate();
            trafficLights_deactivated.push(leftLight);  
          }

          // Right
          if (objectConnectedStreets['right'] != null) {
            trafficLights.push(rightLight);
          }
          else {
            rightLight.deactivate();
            trafficLights_deactivated.push(rightLight);  
          }
          
        }
        else { // Add to Traffic Lights Deactivated
          topLight.deactivate();
          bottomLight.deactivate();
          leftLight.deactivate();
          rightLight.deactivate();
          trafficLights_deactivated.push(topLight, bottomLight, leftLight, rightLight);
        }
      }
      setSemaforosHabilit(trafficLights.length);
      setSemaforosInhabilit(trafficLights_deactivated.length);

      // Creación de carros
      const cars = [];
      // Crear carros para calles horizontales
      for (let i = 1; i < hortBlocks; i++) {
          const streetId1 = "H" + i + "0";
          const streetId2 = "H" + i + (vertBlocks - 1);

          // Crear múltiples carros para la primera calle horizontal
          if (!excludedStreets.has(streetId1)) {
              for (let j = 0; j < carsPerStreet; j++) {
                  const texture1 = PIXI.Assets.get('car' + (1 + Math.floor(Math.random() * 5)));
                  const offsetY = 0;
                  const car1 = new Car(
                      texture1,
                      false,
                      { x: 0, y: wHS * i + halfWidthStreets / 2 + offsetY },
                      1,
                      Math.random() * 1.5 + 0.35
                  );

                  car1.currentStreet = allStreetsRef.current.get(streetId1);
                  car1.nextStreet = car1.currentStreet;

                  carsContainer.addChild(car1);
                  cars.push(car1);
              }
          }

          // Crear múltiples carros para la segunda calle horizontal
          if (!excludedStreets.has(streetId2)) {
              for (let j = 0; j < carsPerStreet; j++) {
                  const texture2 = PIXI.Assets.get('car' + (1 + Math.floor(Math.random() * 5)));
                  const offsetY = 0;
                  const car2 = new Car(
                      texture2,
                      false,
                      { x: canvasWidth, y: wHS * i + halfWidthStreets + halfWidthStreets / 2 + offsetY },
                      -1,
                      Math.random() * 1.5 + 0.8
                  );

                  car2.currentStreet = allStreetsRef.current.get(streetId2);
                  car2.nextStreet = car2.currentStreet;

                  carsContainer.addChild(car2);
                  cars.push(car2);
              }
          }
      }

      // Crear carros para calles verticales
      for (let i = 1; i < vertBlocks; i++) {
          const streetId1 = "V" + i + "0";
          const streetId2 = "V" + i + (hortBlocks - 1);

          // Crear múltiples carros para la primera calle vertical
          if (!excludedStreets.has(streetId1)) {
              for (let j = 0; j < carsPerStreet - 1; j++) {
                  const texture1 = PIXI.Assets.get('car' + (1 + Math.floor(Math.random() * 5)));
                  const offsetX = 0;
                  const car1 = new Car(
                      texture1,
                      true,
                      { x: wVS * i + halfWidthStreets + halfWidthStreets / 2 + offsetX, y: 0 },
                      1,
                      1 + Math.random() * 1.2
                  );

                  car1.currentStreet = allStreetsRef.current.get(streetId1);
                  car1.nextStreet = car1.currentStreet;

                  carsContainer.addChild(car1);
                  cars.push(car1);
              }
          }

          // Crear múltiples carros para la segunda calle vertical
          if (!excludedStreets.has(streetId2)) {
              for (let j = 0; j < carsPerStreet - 1; j++) {
                  const texture2 = PIXI.Assets.get('car' + (1 + Math.floor(Math.random() * 5)));
                  const offsetX = 0;
                  const car2 = new Car(
                      texture2,
                      true,
                      { x: wVS * i + halfWidthStreets - halfWidthStreets / 2 + offsetX, y: canvasHeight },
                      -1,
                      1 + Math.random()
                  );

                  car2.currentStreet = allStreetsRef.current.get(streetId2);
                  car2.nextStreet = car2.currentStreet;

                  carsContainer.addChild(car2);
                  cars.push(car2);
              }
          }
      }

      carsRef.current = cars;

      //Etiquetado de coches, debug
  //     cars.forEach(car => {
  //   const label = new PIXI.HTMLText({
  //     text: `${car.id}`,
  //     style: {
  //       fontFamily: 'Arial',
  //       fontSize: 18,
  //       fill: '#000000ff',
  //       align: 'center',
  //     },
  //   });
  //   label.anchor.set(0.5);
  // app.ticker.add(() => { label.position.copyFrom(car.position); });
  // app.stage.addChild(label);

  // const box = new PIXI.Graphics();
  // app.ticker.add(() => {
  //   box.clear().lineStyle(1, 0xff0000, 1)
  //     .drawRect(car.getBounds().x, car.getBounds().y, car.getBounds().width, car.getBounds().height);
  // });
  // app.stage.addChild(box);
  // });
      // Configurar el game loop
      app.ticker.add((time) => {
        const deltaTime = time.deltaTime;

        // Detección de colisiones entre coches
        // Primero manejo las colisiones coche a coche entre ellos y el mismo carril
        handleCarToCarCollisions(carsRef.current);

        //Para cada coche en el mapa
        for (let i = 0; i < carsRef.current.length; i++) {
          const carA = carsRef.current[i];
          const carABounds = carA.getBounds();
          let carAFrontSensor;

          // Imprimir coordernadas de cada coche, solo si son mayores a 800 y 600
          if (carsRef.current[i].position.x > 800 || carsRef.current[i].position.y > 600) {
            console.log(Coche `${carsRef.current[i].id} - Posición:`, carsRef.current[i].position);
          }
          
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

          // Verifica estado de los semáforos
          let stoppedByLight = false;
          for (const light of trafficLights) {
            const stopZone = light.getStopZone();

            // Solo aplica si el auto va en la misma orientación que el semáforo
            const dir = light.direction;
            const isVerticalLight = (dir === 'top' || dir === 'bottom');
            const matchesDirection =
                (carA.isVertical && isVerticalLight) ||
                (!carA.isVertical && !isVerticalLight);

            if (!matchesDirection && !carA.isStopped) continue;

            if (light.isRed()) {
              const carSensor = carA.getBounds();
              if (carA.isTurning) continue;
              if (areRectanglesIntersecting(carSensor, stopZone)) {
                // Verificamos si el coche ya pasó la intersección
                const [ix, iy, iw, ih] = light.intersection.dimensions;
                const carCenter = {
                  x: carAFrontSensor.x + carAFrontSensor.width / 4,
                  y: carAFrontSensor.y + carAFrontSensor.height / 4
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
                  stoppedByLight = true;
                  break;
                }
              }
            }
          }

          // Si el coche se detuvo por el semáforo, no realiza las demás validaciones.
          if (stoppedByLight) continue;

          // Revisión de intersecciones
          let carANearIntersection = false;
          let isInIntersection = false;
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

              const intersectionInterior = new PIXI.Rectangle(
                intersection.dimensions[0] + 5,
                intersection.dimensions[1] + 5,
                intersection.dimensions[2] - 10,
                intersection.dimensions[3] - 10
              );

              if (areRectanglesIntersecting(carA.getBounds(), intersectionInterior)) {
                isInIntersection = true;

                if (!carA.hasChangedDirection) {
                  let nextStreet = decideNextStreet(carA, intersection, closedStreetsRef);

                  if (!nextStreet) {
                    carA.stopByTraffic();
                    break;
                  }

                  if (closedStreetsRef.current.get(nextStreet.id)) {
                    // Reintentar si la primera opción está cerrada
                    nextStreet = decideNextStreet(carA, intersection, closedStreetsRef);
                    if (!nextStreet) {
                      carA.stopByTraffic();
                      break;
                    }
                  }

                  if (nextStreet !== carA.currentStreet) {
                    carA.nextStreet = nextStreet;
                    carA.setDirectionBasedOnStreet(nextStreet);
                    carA.hasChangedDirection = true;
                  } else if (nextStreet == carA.currentStreet) {
                    // Si no hay otra calle, seguir en la actual
                    carA.nextStreet = carA.currentStreet;
                    carA.setDirectionBasedOnStreet(carA.currentStreet);
                    carA.hasChangedDirection = true;
                  }
                  //console.log(carA.currentStreet.id+"  ->  "+carA.nextStreet.id);
                }
              }
              
              for (let j = 0; j < carsRef.current.length; j++) {
                if (i === j) continue;

                const carB = carsRef.current[j];
                const carBBounds = carB.getBounds();

                const matchesDirection =
                (carA.isVertical && carB.isVertical) ||
                (!carA.isVertical && !carB.isVertical);

                if (areRectanglesIntersecting(carBBounds, intersectionBounds)) {
                  if (areRectanglesIntersecting(carAFrontSensor, intersectionBounds)){
                    //if (carB.id < carA.id)
                    if (carB.isStoppedByTraffic && !matchesDirection)
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
                // Solo reanudar si no está parado por tráfico
                if (!carA.isStoppedByTraffic) {
                  carA.resume();
                }
              }
              break;
            }
          }

          if (!carANearIntersection) {
            // Solo reanudar si no está parado por tráfico
            if (!carA.isStoppedByTraffic) {
              carA.resume();
            }
          }

          if (!isInIntersection && carA.hasChangedDirection) {
            carA.currentStreet = carA.nextStreet;
            carA.hasChangedDirection = false;
            ////console.log("NEW CURRENT STREET: "+carA.currentStreet.id);
          }


          // Lógica de cambio de calle/intersección
          // let isInIntersection = false;

          // for (const [id, intersection] of allIntersectionsRef.current) {
          //   const intersectionInterior = new PIXI.Rectangle(
          //     intersection.dimensions[0] + 5,
          //     intersection.dimensions[1] + 5,
          //     intersection.dimensions[2] - 10,
          //     intersection.dimensions[3] - 10
          //   );

          //   if (areRectanglesIntersecting(carA.getBounds(), intersectionInterior)) {
          //     isInIntersection = true;

          //     if (!carA.hasChangedDirection) {
          //       let nextStreet = decideNextStreet(carA, intersection, closedStreetsRef);

          //       if (closedStreetsRef.current.get(nextStreet.id)) {
          //         // Reintentar si la primera opción está cerrada
          //         nextStreet = decideNextStreet(carA, intersection, closedStreetsRef);
          //       }

          //       if (nextStreet !== carA.currentStreet) {
          //         carA.nextStreet = nextStreet;
          //         carA.setDirectionBasedOnStreet(nextStreet);
          //         carA.hasChangedDirection = true;
          //       } else if (nextStreet == carA.currentStreet) {
          //         // Si no hay otra calle, seguir en la actual
                  

                  
          //         carA.nextStreet = carA.currentStreet;
          //         carA.setDirectionBasedOnStreet(carA.currentStreet);
          //       } else { // Caso nulll
          //         carA.stop();
          //       }
          //       //console.log(carA.currentStreet.id+"  ->  "+carA.nextStreet.id);
          //     }
          //     break;
          //   }
          // }

          // if (!isInIntersection && carA.hasChangedDirection) {
          //   carA.currentStreet = carA.nextStreet;
          //   carA.hasChangedDirection = false;
          //   //console.log("NEW CURRENT STREET: "+carA.currentStreet.id);
          // }

          //Al final, actualiza la posición del coche según las decisiones tomadas a partir de los elementos del mapa
          carA.update(deltaTime, app.screen);
        }
      });
    };

    initPixiApp();

    setTrafficAPI({ closeStreet, openStreet, changeTrafficLight_red, changeTrafficLight_green,
                    deactivateTrafficLight, activateTrafficLight, changeTrafficLightTimeInterval, 
                    openAllStreets, getClosedStreets, changeDensity});
    
    const interval = setInterval(() => {
      // Número de carros
      const currentNumCars = carsRef.current.length;
      setNumCars(currentNumCars);

      // Número de calles cerradas
      const closed = closedStreetsRef.current.size - excludedStreets.size;
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