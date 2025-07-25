import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";

const TrafficSimulation = () => {
  const canvasWidth = 700;
  const canvasHeight = 500;
  const hortBlocks = 4;
  const vertBlocks = 4;
  const wVS = Math.floor(canvasWidth / vertBlocks);
  const wHS = Math.floor(canvasHeight / hortBlocks);
  const halfWidthStreets = 15;

  // Clase para representar un carro
  class Car extends PIXI.Sprite {
    constructor(texture, isVertical, initialPosition, direction, speed) {
      super(texture);

      this.isVertical = isVertical;
      this.direction = direction;
      this.speed = speed;
      this.isStopped = false;

      this.anchor.set(0.5);
      this.scale.set(0.025);

      this.x = initialPosition.x;
      this.y = initialPosition.y;

      if (this.isVertical) {
        this.rotation = this.direction === 1 ? Math.PI / 2 : -Math.PI / 2;
      }
    }

    stop() {
      this.isStopped = true;
    }
  
    resume() {
      this.isStopped = false;
    }

    update(deltaTime, appScreen) {
      if (this.isStopped) return;
      
      if (!this.isVertical) {
        this.x += this.speed * this.direction * deltaTime;

        if (this.direction === 1 && this.x > appScreen.width + 100) {
          this.x = -100;
        } else if (this.direction === -1 && this.x < -100) {
          this.x = appScreen.width + 100;
        }
      } else {
        this.y += this.speed * this.direction * deltaTime;

        if (this.direction === 1 && this.y > appScreen.height + 100) {
          this.y = -100;
        } else if (this.direction === -1 && this.y < -100) {
          this.y = appScreen.height + 100;
        }
      }
    }
  }

  // Clase para representar una Calle
  class Street {
    constructor(id, dimensions, orientation, container) {
      this.id = id;
      this.dimensions = dimensions;
      this.orientation = orientation;
      this.isClosed = false;
      this.graphics = createStreetGraphic(dimensions);
      this.graphics.label = id;
      this.container = container;
      this.container.addChild(this.graphics);
      this.drawLaneLines();
    }

    drawLaneLines() {
      const line = new PIXI.Graphics();
      const line1 = new PIXI.Graphics();
      const line2 = new PIXI.Graphics();

      if (this.orientation === 'horizontal') {
        line.moveTo(this.dimensions[0], this.dimensions[1] + halfWidthStreets);
        line.lineTo(this.dimensions[0] + this.dimensions[2], this.dimensions[1] + halfWidthStreets);
        line.stroke({ width: 2, pixelLine: true, color: 0xffffff });

        line1.moveTo(this.dimensions[0], this.dimensions[1] + 2 * halfWidthStreets);
        line1.lineTo(this.dimensions[0] + this.dimensions[2], this.dimensions[1] + 2 * halfWidthStreets);
        line1.stroke({ width: 4, color: 0x353535 });

        line2.moveTo(this.dimensions[0], this.dimensions[1]);
        line2.lineTo(this.dimensions[0] + this.dimensions[2], this.dimensions[1]);
        line2.stroke({ width: 4, color: 0x353535 });
      } else {
        line.moveTo(this.dimensions[0] + halfWidthStreets, this.dimensions[1]);
        line.lineTo(this.dimensions[0] + halfWidthStreets, this.dimensions[1] + this.dimensions[3]);
        line.stroke({ width: 2, pixelLine: true, color: 0xffffff });

        line1.moveTo(this.dimensions[0] + 2 * halfWidthStreets, this.dimensions[1]);
        line1.lineTo(this.dimensions[0] + 2 * halfWidthStreets, this.dimensions[1] + this.dimensions[3]);
        line1.stroke({ width: 4, color: 0x353535 });

        line2.moveTo(this.dimensions[0], this.dimensions[1]);
        line2.lineTo(this.dimensions[0], this.dimensions[1] + this.dimensions[3]);
        line2.stroke({ width: 4, color: 0x353535 });
      }
      this.container.addChild(line, line1, line2);
    }

    toggleClosed() {
      this.isClosed = !this.isClosed;
      const overlayName = `closed_overlay_${this.id}`;

      if (this.isClosed) {
        let closedStreetGraphic = createStreetGraphic(this.dimensions, 0xE4080A);
        closedStreetGraphic.name = overlayName;
        this.container.addChild(closedStreetGraphic);
      } else {
        const closedGraphic = this.container.getChildByName(overlayName);
        if (closedGraphic) {
          this.container.removeChild(closedGraphic);
          closedGraphic.destroy(); 
        }
      }
    }
  }

  // Clase para representar una Intersección
  class Intersection {
    constructor(id, dimensions, container) {
      this.id = id;
      this.dimensions = dimensions;
      this.isClosed = false;
      this.graphics = createStreetGraphic(dimensions, 0x6a6a6a, false);
      this.container = container;
      this.container.addChild(this.graphics);
      this.connectedStreets = {};
    }

    toggleClosed() {
      // Lógica para cambiar el estado de la intersección
    }

    addConnectedStreet(direction, streetObject) {
      this.connectedStreets[direction] = streetObject;
    }
  }

  // Función para crear un gráfico de calle
  const createStreetGraphic = (streetDimension, color = 0x444444) => {
    let context = new PIXI.GraphicsContext().fill(color);
    let graphic = new PIXI.Graphics(context);
    graphic.stroke({ width: 1, pixelLine: true });
    graphic.rect(streetDimension[0], streetDimension[1], streetDimension[2], streetDimension[3]);
    graphic.fill(color);
    return graphic;
  };

  // Función para verificar la intersección de dos rectángulos
  const areRectanglesIntersecting = (rect1, rect2) => {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  };

  const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  const drawStreets = (container, streetsMap) => {
    // Drawing horizontal streets
    for (let i = 1; i < hortBlocks; i++) {
      for (let j = 0; j < vertBlocks; j++) {
        let streetDimension = [j * wVS, wHS * i - halfWidthStreets, wVS, 2 * halfWidthStreets];
        const streetId = "H" + i + j;
        const street = new Street(streetId, streetDimension, 'horizontal', container);
        streetsMap.set(streetId, street);
      }
    }

    // Drawing vertical streets
    for (let i = 1; i < vertBlocks; i++) {
      for (let j = 0; j < hortBlocks; j++) {
        let streetDimension = [wVS * i - halfWidthStreets, j * wHS, 2 * halfWidthStreets, wHS];
        const streetId = "V" + i + j;
        const street = new Street(streetId, streetDimension, 'vertical', container);
        streetsMap.set(streetId, street);
      }
    }
  };

  const drawIntersections = (container, intersectionsMap) => {
    for (let i = 1; i < hortBlocks; i++) {
      for (let j = 1; j < vertBlocks; j++) {
        let intersectionDimension = [j * wVS - halfWidthStreets, wHS * i - halfWidthStreets, 2 * halfWidthStreets, 2 * halfWidthStreets];
        const intersectionId = "I" + i + j;
        const intersection = new Intersection(intersectionId, intersectionDimension, container);
        intersectionsMap.set(intersectionId, intersection);
      }
    }
  };

  const setComplex = (container) => {
    for (let i = 0; i < vertBlocks; i++) {
      for (let j = 0; j < hortBlocks; j++) {
        const spriteBlock = PIXI.Sprite.from('complex' + (1 + Math.floor(Math.random() * 7)));
        if (i == 0 || j == 0) {
          spriteBlock.x = i * wVS;
          spriteBlock.y = j * wHS;
        } else {
          spriteBlock.x = i * wVS + halfWidthStreets;
          spriteBlock.y = j * wHS + halfWidthStreets;
        }
        spriteBlock.scale.set(0.29);
        container.addChild(spriteBlock);
      }
    }
  };

  const closeStreet = async (nameStreet = "H10", allStreets, closedStreets) => {
    const streetToClose = allStreets.get(nameStreet);
    if (!streetToClose || closedStreets.has(nameStreet)) return;

    streetToClose.toggleClosed();
    closedStreets.set(nameStreet, true);
    console.log(`Calle ${nameStreet} cerrada.`);

    await sleep(8000);
    openStreet(nameStreet, allStreets, closedStreets);
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

  const preloadElements = async () => {
    const assets = [
      { alias: 'street', src: "/assets/street_texture.png" },
      { alias: 'grass_bg', src: "assets/grass.png" },
      { alias: 'city1_bg', src: "assets/city1.png" },
      { alias: 'building', src: "assets/building1.png" },
      { alias: 'complex1', src: "/assets/complex1.png" },
      { alias: 'complex2', src: "/assets/complex2.png" },
      { alias: 'complex3', src: "/assets/complex3.png" },
      { alias: 'complex4', src: "/assets/complex4.png" },
      { alias: 'complex5', src: "/assets/complex5.png" },
      { alias: 'complex6', src: "/assets/complex6.png" },
      { alias: 'complex7', src: "/assets/complex7.png" },
      { alias: 'car1', src: "/assets/car1.png" },
      { alias: 'car2', src: "/assets/car2.png" },
      { alias: 'car3', src: "/assets/car3.png" },
      { alias: 'car4', src: "/assets/car4.png" },
      { alias: 'car5', src: "/assets/car5.png" }
    ];
    await PIXI.Assets.load(assets);
  };

  const pixiContainerRef = useRef(null);
  const appRef = useRef(null);
  const carsRef = useRef([]);
  const allStreetsRef = useRef(new Map());
  const allIntersectionsRef = useRef(new Map());
  const closedStreetsRef = useRef(new Map());

  useEffect(() => {
    const initPixiApp = async () => {
      await preloadElements();
      
      const app = new PIXI.Application({
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: 0x1099bb
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
        car2.scale.x *= -1;
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

      // Cerrar una calle para probar
      closeStreet("V21", allStreetsRef.current, closedStreetsRef.current);

      // Configurar el game loop
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
                  if (!carB.isStopped) {
                    shouldCarAStop = true;
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

    return () => {
        if (appRef.current) {
        appRef.current.destroy(true);
        }
    };
    }, []);

  return <div ref={pixiContainerRef} />;
};

export default TrafficSimulation;