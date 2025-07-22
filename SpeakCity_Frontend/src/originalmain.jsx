/* ESTE CÓDIGO ES EL MAIN.JS DE DANI Y URI, 
AGREGADO SOLO CON FINES DE PODER CONSULTAR EL ORIGINAL EN CUALQUIER MOMENTO */



import { Application, Assets, Graphics, Sprite, Container, GraphicsContext, Texture, Rectangle } from "pixi.js";

const canvasWidth = 800;
const canvasHeight = 600;
const hortBlocks = 4;
const vertBlocks = 4;
const wVS = Math.floor(canvasWidth / vertBlocks);
const wHS = Math.floor(canvasHeight / hortBlocks);
const halfWidthStreets = 15;

// Clase para representar un carro, heredando de PIXI.Sprite
class Car extends Sprite {
    constructor(texture, isVertical, initialPosition, direction, speed) {
        super(texture);

        this.isVertical = isVertical;
        this.direction = direction;
        this.speed = speed;
        this.isStopped = false; // Nuevo: para controlar si el carro está detenido

        this.anchor.set(0.5);
        this.scale.set(0.025);

        this.x = initialPosition.x;
        this.y = initialPosition.y;

        // Rotar el carro si es vertical
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

    // Método para actualizar la posición del carro en cada fotograma
    update(deltaTime, appScreen) {
        if (this.isStopped) {
            return; // Si el carro está detenido, no actualices su posición
        }
        if (!this.isVertical) {
            // Lógica de movimiento horizontal
            this.x += this.speed * this.direction * deltaTime;

            // Lógica para que el carro vuelva a salir nuevamente al llegar al borde
            if (this.direction === 1 && this.x > appScreen.width + 100) {
                this.x = -100;
            } else if (this.direction === -1 && this.x < -100) {
                this.x = appScreen.width + 100;
            }
        } else {
            // Lógica de movimiento vertical
            this.y += this.speed * this.direction * deltaTime;

            // Lógica para que el carro vuelva a salir nuevamente al llegar al borde
            if (this.direction === 1 && this.y > appScreen.height + 100) {
                this.y = -100;
            } else if (this.direction === -1 && this.y < -100) {
                this.y = appScreen.height + 100;
            }
        }
    }
}

// Función para crear un gráfico de calle
function createStreetGraphic(streetDimension, color = 0x444444) {
    let context = new GraphicsContext().fill(color);
    let graphic = new Graphics(context);
    graphic.stroke({ width: 1, pixelLine: true });
    graphic.rect(streetDimension[0], streetDimension[1], streetDimension[2], streetDimension[3]);
    graphic.fill(color);
    return graphic;
}

// Clase para representar una Calle
class Street {
    constructor(id, dimensions, orientation, container) {
        this.id = id;
        this.dimensions = dimensions; // [x, y, width, height]
        this.orientation = orientation; // 'horizontal' o 'vertical'
        this.isClosed = false; // Estado inicial: abierta
        this.graphics = createStreetGraphic(dimensions); // La representación visual de la calle
        this.graphics.label = id; // Asignar un label para depuración si es necesario
        this.container = container; // Contenedor de PixiJS donde se añadirá
        this.container.addChild(this.graphics);
        this.drawLaneLines(); // Dibuja las líneas de carril
    }

    // Método para dibujar las líneas de carril (blancas y grises)
    drawLaneLines() {
        const line = new Graphics();
        const line1 = new Graphics();
        const line2 = new Graphics();

        if (this.orientation === 'horizontal') {
            line.moveTo(this.dimensions[0], this.dimensions[1] + halfWidthStreets);
            line.lineTo(this.dimensions[0] + this.dimensions[2], this.dimensions[1] + halfWidthStreets);
            line.stroke({ width: 2, pixelLine: true, color: 0xffffff }); // Línea central blanca

            line1.moveTo(this.dimensions[0], this.dimensions[1] + 2 * halfWidthStreets);
            line1.lineTo(this.dimensions[0] + this.dimensions[2], this.dimensions[1] + 2 * halfWidthStreets);
            line1.stroke({ width: 4, color: 0x353535 }); // Borde inferior

            line2.moveTo(this.dimensions[0], this.dimensions[1]);
            line2.lineTo(this.dimensions[0] + this.dimensions[2], this.dimensions[1]);
            line2.stroke({ width: 4, color: 0x353535 }); // Borde superior
        } else { // vertical
            line.moveTo(this.dimensions[0] + halfWidthStreets, this.dimensions[1]);
            line.lineTo(this.dimensions[0] + halfWidthStreets, this.dimensions[1] + this.dimensions[3]);
            line.stroke({ width: 2, pixelLine: true, color: 0xffffff }); // Línea central blanca

            line1.moveTo(this.dimensions[0] + 2 * halfWidthStreets, this.dimensions[1]);
            line1.lineTo(this.dimensions[0] + 2 * halfWidthStreets, this.dimensions[1] + this.dimensions[3]);
            line1.stroke({ width: 4, color: 0x353535 }); // Borde derecho

            line2.moveTo(this.dimensions[0], this.dimensions[1]);
            line2.lineTo(this.dimensions[0], this.dimensions[1] + this.dimensions[3]);
            line2.stroke({ width: 4, color: 0x353535 }); // Borde izquierdo
        }
        this.container.addChild(line, line1, line2);
    }

    // Método para cambiar el estado de la calle (abierta/cerrada)
    toggleClosed() {
        this.isClosed = !this.isClosed;
        const overlayName = `closed_overlay_${this.id}`;

        if (this.isClosed) { //Si la calle cambia a cerrada, se crea un elemento para mostrar su estado
            let closedStreetGraphic = createStreetGraphic(this.dimensions, 0xE4080A);
            closedStreetGraphic.name = overlayName; // Asignar un nombre único para el overlay
            this.container.addChild(closedStreetGraphic);
            
            console.log("Calle cerrada: " + this.id + "    " + this.dimensions);
        } else { // El elemento para mostrar estado de cerrado es eliminado
            const closedGraphic = this.container.getChildByName(overlayName); // Buscar por nombre
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
        this.dimensions = dimensions; // [x, y, width, height]
        this.isClosed = false; // Estado inicial: abierta
        this.graphics = createStreetGraphic(dimensions, 0x6a6a6a, false); // La representación visual de la intersección
        this.container = container; // Contenedor de PixiJS donde se añadirá
        this.container.addChild(this.graphics);
        this.connectedStreets = {}; // Objeto para almacenar las calles conectadas (futuro uso)
    }

    // Método para cambiar el estado de la intersección
    toggleClosed() {
        ///// Logica para cambiar el estado de la intersección (abierta/cerrada) si es necesario
    }
    // Método para conectar calles a la intersección
    addConnectedStreet(direction, streetObject) {
        this.connectedStreets[direction] = streetObject;
    }
}

// Función para verificar la intersección de dos rectángulos (AABB)
function areRectanglesIntersecting(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

///////////////
///Solo para probar que funcione
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let closedStreets = new Map();
// Funciones para el cierre y apertura de calles
async function closeStreet(nameStreet = "H10") {
    const streetToClose = allStreets.get(nameStreet);
    if (!streetToClose || closedStreets.has(nameStreet)) return;

    streetToClose.toggleClosed();
    closedStreets.set(nameStreet, true);
    console.log(`Calle ${nameStreet} cerrada.`);

    await sleep(8000); // Espera 4 segundos antes de abrir la calle
    openStreet(nameStreet);
}

function openStreet(nameStreet = "H10") {
    if (closedStreets.has(nameStreet)) {
        const streetToOpen = allStreets.get(nameStreet);
        if (streetToOpen) {
            streetToOpen.toggleClosed();
            closedStreets.delete(nameStreet);
            console.log(`Calle ${nameStreet} reabierta.`);
        }
    }
}

async function preloadElements() {
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
    await Assets.load(assets);
}

function drawStreets(container, streetsMap) {
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
}

function drawIntersections(container, intersectionsMap) {
    for (let i = 1; i < hortBlocks; i++) {
        for (let j = 1; j < vertBlocks; j++) {
            let intersectionDimension = [j * wVS - halfWidthStreets, wHS * i - halfWidthStreets, 2 * halfWidthStreets, 2 * halfWidthStreets];
            const intersectionId = "I" + i + j;
            const intersection = new Intersection(intersectionId, intersectionDimension, container);
            intersectionsMap.set(intersectionId, intersection);
            // Asignar calles conectadas después de que todas las calles existan
            // Esto se hará en la función principal (async () => {})
        }
    }
}

function setComplex(container) {
    for (let i = 0; i < vertBlocks; i++) {
        for (let j = 0; j < hortBlocks; j++) {
            const spriteBlock = Sprite.from('complex' + (1 + Math.floor(Math.random() * 7)))
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
}

const cars = [];
let allStreets = new Map(); // Mapa para almacenar objetos Street
let allIntersections = new Map(); // Mapa para almacenar objetos Intersection

(async () => {
    await preloadElements();
    const app = new Application();
    await app.init({ width: canvasWidth, height: canvasHeight });
    document.getElementById("pixi-container").appendChild(app.canvas);

    const backgroundTexture = Texture.from('grass_bg');
    const background = new Sprite(backgroundTexture);
    background.width = app.screen.width;
    background.height = app.screen.height;
    app.stage.addChildAt(background, 0);

    const blockContainer = new Container();
    const streetContainer = new Container();
    const intersectionContainer = new Container();
    const carsContainer = new Container();
    app.stage.addChild(blockContainer);
    app.stage.addChild(streetContainer);
    app.stage.addChild(intersectionContainer);
    app.stage.addChild(carsContainer);

    drawStreets(streetContainer, allStreets);
    drawIntersections(intersectionContainer, allIntersections);

    // Asignar calles conectadas a las intersecciones después de que todo esté dibujado
    for (let i = 1; i < hortBlocks; i++) {
        for (let j = 1; j < vertBlocks; j++) {
            const intersectionId = "I" + i + j;
            const intersection = allIntersections.get(intersectionId);
            if (intersection) {
                intersection.connectedStreets = {
                    'top': allStreets.get("V" + i + (j - 1)),
                    'bottom': allStreets.get("V" + i + j),
                    'left': allStreets.get("H" + i + (j - 1)),
                    'right': allStreets.get("H" + i + j)
                };
                console.log(`Intersección ${intersectionId} conectada a:`, intersection.connectedStreets);
            }
        }
    }

    setComplex(blockContainer);

    // Creación de carros para doble carril
    // Crear carros para calles horizontales
    for (let i = 1; i < hortBlocks; i++) {
        const texture1 = Assets.get('car' + (1 + Math.floor(Math.random() * 5)));
        const texture2 = Assets.get('car' + (1 + Math.floor(Math.random() * 5)));

        // Carro 1: Se mueve hacia la derecha en el carril superior
        const car1 = new Car(
            texture1,
            false,
            { x: 0, y: wHS * i - (halfWidthStreets / 2) }, // Posición en el carril superior
            1, // dirección 1: derecha
            1 + Math.random() // velocidad aleatoria
        );
        carsContainer.addChild(car1);
        cars.push(car1);

        // Carro 2: Se mueve hacia la izquierda en el carril inferior
        const car2 = new Car(
            texture2,
            false,
            { x: canvasWidth, y: wHS * i + (halfWidthStreets / 2) }, // Posición en el carril inferior
            -1, // dirección -1: izquierda
            1 + Math.random() // velocidad aleatoria
        );
        car2.scale.x *= -1; // Voltea el sprite horizontalmente
        carsContainer.addChild(car2);
        cars.push(car2);
    }

    // Crear carros para calles verticales
    for (let i = 1; i < vertBlocks; i++) {
        const texture1 = Assets.get('car' + (1 + Math.floor(Math.random() * 5)));
        const texture2 = Assets.get('car' + (1 + Math.floor(Math.random() * 5)));

        // Carro 1: Se mueve hacia abajo en el carril izquierdo
        const car1 = new Car(
            texture1,
            true,
            { x: wVS * i - (halfWidthStreets / 2), y: 0 }, // Posición en el carril izquierdo
            1, // dirección 1: abajo
            1 + Math.random() // velocidad aleatoria
        );
        carsContainer.addChild(car1);
        cars.push(car1);

        // Carro 2: Se mueve hacia arriba en el carril derecho
        const car2 = new Car(
            texture2,
            true,
            { x: wVS * i + (halfWidthStreets / 2), y: canvasHeight }, // Posición en el carril derecho
            -1, // dirección -1: arriba
            1 + Math.random() // velocidad aleatoria
        );
        car2.scale.y *= -1; // Voltea el sprite verticalmente para que mire hacia arriba
        carsContainer.addChild(car2);
        cars.push(car2);
    }



    // LLAMAR A ESTA FUNCIÓN PARA CERRAR CALLES
    closeStreet("V21"); 

    // El ticker actualiza la posición de todos los carros y gestiona las colisiones
    app.ticker.add((time) => {
        const deltaTime = time.deltaTime;

        // Paso 1: Mover todos los carros según su estado actual (moviéndose o detenido)
        for (const car of cars) {
            car.update(deltaTime, app.screen);
        }

        // Paso 2: Realizar la detección y resolución de colisiones
        for (let i = 0; i < cars.length; i++) {
            const carA = cars[i];
            // Obtener los límites globales del carro A (su caja delimitadora)
            const carABounds = carA.getBounds();
            let carAFrontSensor ;
            if (carA.isVertical){
                if (carA.direction == 1){ // Con dirección al sur
                    carAFrontSensor = new Rectangle(
                        carABounds.x,
                        carABounds.y + carABounds.height - carABounds.height/4, //Sensor de una cuarta parte del ancho y largo del coche
                        carABounds.width,
                        carABounds.height/4
                    );
                } else { //Con dirección al norte
                    carAFrontSensor= new Rectangle(
                        carABounds.x,
                        carABounds.y, //Sensor de una cuarta parte del ancho y largo del coche
                        carABounds.width,
                        carABounds.height/4
                    );
                }
            } else{
                if (carA.direction == 1){ // Con dirección a la derecha
                    carAFrontSensor= new Rectangle(
                        carABounds.x+ carABounds.width - carABounds.width/4,
                        carABounds.y, //Sensor de una cuarta parte del ancho y largo del coche
                        carABounds.width / 4,
                        carABounds.height
                    );
                } else {
                    carAFrontSensor= new Rectangle(
                        carABounds.x,
                        carABounds.y, //Sensor de una cuarta parte del ancho y largo del coche
                        carABounds.width / 4,
                        carABounds.height
                    );
                }
                
            }
            let carANearIntersection = false; // Bandera para saber si carA está cerca de alguna intersección

            // Iterar sobre todas las intersecciones para ver si carA está cerca
            for (const [id, intersection] of allIntersections) {
                // Crear una caja delimitadora de la intersección para la detección
                const intersectionBounds = new Rectangle(
                    intersection.dimensions[0],
                    intersection.dimensions[1],
                    intersection.dimensions[2],
                    intersection.dimensions[3]
                );

                // Definir un "buffer" alrededor de la intersección para que los carros se detengan antes de entrar
                const intersectionBuffer = 20; // Píxeles de margen alrededor de la intersección
                const bufferedIntersectionBounds = new Rectangle(
                    intersection.dimensions[0] - intersectionBuffer,
                    intersection.dimensions[1] - intersectionBuffer,
                    intersection.dimensions[2] + 2 * intersectionBuffer,
                    intersection.dimensions[3] + 2 * intersectionBuffer
                );

                // Si el carro A intersecta con la zona de "buffer" de la intersección
                if (areRectanglesIntersecting(carAFrontSensor.getBounds(), bufferedIntersectionBounds)) {
                    carANearIntersection = true;
                    let shouldCarAStop = false; // Bandera para decidir si carA debe detenerse

                    // Ahora, verificar si hay otros carros dentro de la intersección real (no el buffer)
                    for (let j = 0; j < cars.length; j++) {
                        if (i === j) continue; // No verificar colisión consigo mismo

                        const carB = cars[j];
                        const carBBounds = carB.getBounds();

                        // Si el carro B está dentro de la intersección (la zona central)
                        if (areRectanglesIntersecting(carBBounds, intersectionBounds)) {
                            //Se activa bandera de alto de carro A solo si el carro B no se ha detenido
                            if (!carB.isStopped){
                                shouldCarAStop = true;
                            }
                            break; // No es necesario seguir buscando si ya encontramos un bloqueador
                        }
                    }

                    if (shouldCarAStop) {
                        carA.stop();
                    } else {
                        carA.resume();
                    }
                    break; // Una vez que carA encuentra una intersección relevante, no necesita buscar más
                }
            }

            // Si el carro A no está cerca de ninguna intersección, asegúrate de que esté en movimiento
        if (!carANearIntersection) {
          carA.resume();
        }
        // Verificación por calle cerrada y orientación
        for (const [streetId] of closedStreets) {
          const closedStreet = allStreets.get(streetId);
          if (!closedStreet) continue;

          const stopMargin = 20;
          let stopZone;

          if (closedStreet.orientation === 'horizontal') {
            if (carA.direction === 1) { // coche va hacia la derecha
              stopZone = new Rectangle(
                closedStreet.dimensions[0] - stopMargin,
                closedStreet.dimensions[1],
                stopMargin,
                closedStreet.dimensions[3]
              );
            } else { // coche va hacia la izquierda
              stopZone = new Rectangle(
                closedStreet.dimensions[0] + closedStreet.dimensions[2],
                closedStreet.dimensions[1],
                stopMargin,
                closedStreet.dimensions[3]
              );
            }
          } else { // vertical
            if (carA.direction === 1) { // coche va hacia abajo
              stopZone = new Rectangle(
                closedStreet.dimensions[0],
                closedStreet.dimensions[1] - stopMargin,
                closedStreet.dimensions[2],
                stopMargin
              );
            } else { // coche va hacia arriba
              stopZone = new Rectangle(
                closedStreet.dimensions[0],
                closedStreet.dimensions[1] + closedStreet.dimensions[3],
                closedStreet.dimensions[2],
                stopMargin
              );
            }
          }

          // Verifica si el coche debe detenerse por orientación y zona de freno
          if (closedStreet.orientation === 'horizontal' && !carA.isVertical) {
            if (areRectanglesIntersecting(carAFrontSensor.getBounds(), stopZone)) {
              carA.stop();
              break;
            }
          }
          if (closedStreet.orientation === 'vertical' && carA.isVertical) {
            if (areRectanglesIntersecting(carAFrontSensor.getBounds(), stopZone)) {
              carA.stop();
              break;
            }
          }
        }
      }
    });
})();
