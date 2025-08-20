// Classes/Car.js
import * as PIXI from "pixi.js";
import { CANVAS_CONFIG} from "../utils/constants";
let nextCarID = 0;
const { halfWidthStreets } = CANVAS_CONFIG;

export class Car extends PIXI.Sprite {
  constructor(texture, isVertical, initialPosition, direction, speed, currentStreet = null, nextStreet = null) {
    super(texture);

    this.id = nextCarID++;
    this.isVertical = isVertical;
    this.direction = direction;
    this.speed = speed;
    this.isStopped = false;
    this.isStoppedByTraffic = false; // Nueva propiedad para distinguir paradas por tráfico

    this.anchor.set(0.5,0.5);
    this.scale.set(0.020);

    this.x = initialPosition.x;
    this.y = initialPosition.y;

    this.setCarRotation();

    this.currentStreet = currentStreet;
    this.nextStreet = nextStreet;
    this.hasChangedDirection = false;

    this.startTurnU = false;
    this.isTurning = false;
    this.turnTime = 0;
    this.turnDuration = 30;
    this.turnPath = [];
    this.turnIndex = 0;

    // Propiedades para detección de colisiones
    this.detectionDistance = 30; // Distancia del sensor frontal en píxeles
    this.minFollowDistance = 40; // Distancia mínima a mantener con el coche de adelante en píxeles
  }

  // Uso operador ternario!!!
  setCarRotation() {
    if (this.isVertical) {
      this.rotation = (this.direction === 1) ? Math.PI / 2 : -Math.PI / 2;
    } else {
      this.rotation = (this.direction === 1) ? 0 : Math.PI;
    }
  }

  stop() { this.isStopped = true; }
  resume() { this.isStopped = false; }
  
  // Nuevos métodos para manejar paradas por tráfico
  stopByTraffic() { 
    this.isStopped = true; 
    this.isStoppedByTraffic = true; 
  }
  
  resumeFromTraffic() { 
    this.isStopped = false; 
    this.isStoppedByTraffic = false; 
  }

  // Método para obtener el sensor frontal del coche
  getFrontSensor() {
    const bounds = this.getBounds();
    let sensorBounds;

    if (this.isVertical) {
      if (this.direction === 1) { // Hacia abajo
        sensorBounds = new PIXI.Rectangle(
          bounds.x,
          bounds.y + bounds.height,
          bounds.width,
          this.detectionDistance
        );
      } else { // Hacia arriba
        sensorBounds = new PIXI.Rectangle(
          bounds.x,
          bounds.y - this.detectionDistance,
          bounds.width,
          this.detectionDistance
        );
      }
    } else { // Horizontal
      if (this.direction === 1) { // Hacia la derecha
        sensorBounds = new PIXI.Rectangle(
          bounds.x + bounds.width,
          bounds.y,
          this.detectionDistance,
          bounds.height
        );
      } else { // Hacia la izquierda
        sensorBounds = new PIXI.Rectangle(
          bounds.x - this.detectionDistance,
          bounds.y,
          this.detectionDistance,
          bounds.height
        );
      }
    }

    return sensorBounds;
  }

  // Método para calcular la distancia al coche de adelante
  getDistanceToCarAhead(otherCar) { //Otro gato referencia
    const myBounds = this.getBounds();
    const otherBounds = otherCar.getBounds();

    if (this.isVertical) {
      if (this.direction === 1) { // Hacia abajo
        return otherBounds.y - (myBounds.y + myBounds.height);
      } else { // Hacia arriba
        return myBounds.y - (otherBounds.y + otherBounds.height);
      }
    } else { // Horizontal
      if (this.direction === 1) { // Hacia la derecha
        return otherBounds.x - (myBounds.x + myBounds.width);
      } else { // Hacia la izquierda
        return myBounds.x - (otherBounds.x + otherBounds.width);
      }
    }
  }

  // Método para verificar si otro coche está en el mismo carril y adelante
  isCarInSameLaneAhead(otherCar) {
    const myBounds = this.getBounds();
    const otherBounds = otherCar.getBounds();
    const laneWidth = 30; // Tolerancia para considerar mismo carril

    // Verificar si van en la misma orientación
    if (this.isVertical !== otherCar.isVertical) {
      return false;
    }

    // Verificar si van en la misma dirección
    if (this.direction !== otherCar.direction) {
      return false;
    }

    if (this.isVertical) {
      // Para coches verticales, verificar si están en el mismo carril horizontal
      const horizontalDistance = Math.abs(
        (myBounds.x + myBounds.width / 2) - (otherBounds.x + otherBounds.width / 2)
      );
      
      if (horizontalDistance > laneWidth) {
        return false;
      }

      // Verificar si el otro coche está adelante
      if (this.direction === 1) { // Hacia abajo
        return otherBounds.y > myBounds.y;
      } else { // Hacia arriba
        return otherBounds.y < myBounds.y;
      }
    } else {
      // Para coches horizontales, verificar si están en el mismo carril vertical
      const verticalDistance = Math.abs(
        (myBounds.y + myBounds.height / 2) - (otherBounds.y + otherBounds.height / 2)
      );
      
      if (verticalDistance > laneWidth) {
        return false;
      }

      // Verificar si el otro coche está adelante
      if (this.direction === 1) { // Hacia la derecha
        return otherBounds.x > myBounds.x;
      } else { // Hacia la izquierda
        return otherBounds.x < myBounds.x;
      }
    }
  }

  setDirectionBasedOnStreet(nextStreet) {
    if (!nextStreet) return;

    if (nextStreet == this.currentStreet){
      this.startTurnU = true;
      return;
    }

    const [streetX, streetY, streetWidth, streetHeight] = nextStreet.dimensions;
    const comingFromVertical = this.isVertical;
    const goingToVertical = (nextStreet.orientation === 'vertical');

    //console.log("Posicion actual del coche : " + this.x + ","+this.y);
    // Giro de horizontal -> vertical
    if (!comingFromVertical && goingToVertical) {
      this.isVertical = true;
      if (this.direction === 1) {
        // venía de la izquierda
        if (this.y < streetY ) {
          this.direction = 1; // gira abajo
          this.x = streetX + halfWidthStreets / 2;                // carril baja
        } else {
          this.direction = -1; // gira arriba
          this.x = streetX + halfWidthStreets / 2 + halfWidthStreets; // carril sube
        }
      } else {
        // venía de la derecha
        if (this.y < (streetY + 10)) { //Se agrega umbral teniendo en cuenta el origen de la calle
          this.direction = 1;  // gira abajo
          this.x = streetX + halfWidthStreets / 2;
        } else {
          this.direction = -1; // gira arriba
          this.x = streetX + halfWidthStreets / 2 + halfWidthStreets;
        }
      }
    }
    // Giro de vertical -> horizontal
    else if (comingFromVertical && !goingToVertical) {
      this.isVertical = false;
      if (this.direction === 1) {
        // venía de arriba (bajando)
        if (this.x < streetX) {
          this.direction = 1; // gira derecha
          this.y = streetY + halfWidthStreets / 2;                // carril derecho
        } else {
          this.direction = -1; // gira izquierda
          this.y = streetY + halfWidthStreets / 2 + halfWidthStreets; // carril izquierdo
        }
      } else {
        // venía de abajo (subiendo)
        if (this.x < (streetX + 10)) { //Se agrega umbral teniendo en cuenta el origen de la calle
          this.direction = 1;  // gira derecha
          this.y = streetY + halfWidthStreets / 2;
        } else {
          this.direction = -1; // gira izquierda
          this.y = streetY + halfWidthStreets / 2 + halfWidthStreets;
        }
      }
    }

    this.setCarRotation(); // Actualizo la rotación según el nuevo eje y no en el constructor
  }

  // Bézier cuadrática
  bezier(t, p0, p1, p2) {
    const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x;
    const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y;
    return { x, y };
  }

  // Nueva función para calcular la tangente de la curva cuadrática
  tangentAngleOnQuadratic(t, p0, p1, p2) {
    const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    return Math.atan2(dy, dx);
  }

  startUTurn(pathPoints) {
    this.isTurning = true;
    this.turnPath = pathPoints;
    this.turnIndex = 0;
    this.turnTime = 0;
  }

  update(deltaTime, appScreen) {
    const giroOffset = 15;
    const margen = halfWidthStreets;

    // Animación de giro
    if (this.isTurning) {
      this.turnTime++;
      let t = this.turnTime / this.turnDuration;
      //Evito calculos fuera del rango 0 y 1
      if (t < 0) t = 0;
      if (t > 1) t = 1;

      const p0 = this.turnPath[0];
      const p1 = this.turnPath[1];
      const p2 = this.turnPath[2];

      const { x, y } = this.bezier(t, p0, p1, p2);
      this.x = x;
      this.y = y;

      // Orienta con la tangente de la curva para eso se hizo
      this.rotation = this.tangentAngleOnQuadratic(t, p0, p1, p2);

      // Fin del giro
      if (t >= 1) {
        this.isTurning = false;
        this.setCarRotation();
      }
      return;
    }

    if (this.isStopped) return;

    if (!this.isVertical) {
      // Horizontal
      this.x += this.speed * this.direction * deltaTime;

      // Inicia vuelta en U para el caso de la única calle disponible es la actual
      if (this.startTurnU){
        this.startTurnU = false;
        // derecha → izquierda (rebote en borde derecho)
        if (this.direction === 1 ) {
          this.direction = -1; // invierte sentido
          const p0 = { x: this.x, y: this.y };
          const p1 = { x: this.x + 10, y: this.y + halfWidthStreets*0.5 }; // control para curvar
          const p2 = { x: this.x, y: this.y + halfWidthStreets };
          this.startUTurn([p0, p1, p2]);
        }
        // izquierda → derecha (rebote en borde izquierdo)
        else if (this.direction === -1) {
          this.direction = 1; // invierte sentido
          const p0 = { x: this.x, y: this.y };
          const p1 = { x: this.x - 10, y: this.y - halfWidthStreets*0.5 };
          const p2 = { x: this.x, y: this.y - halfWidthStreets };
          this.startUTurn([p0, p1, p2]);
        }
        this.startTurnU = false;
      }
    } else {
      // Vertical
      this.y += this.speed * this.direction * deltaTime;

      // Inicia vuelta en U para el caso de la única calle disponible es la actual
      if (this.startTurnU){
        //this.startTurnU = false;
        // abajo → arriba (rebote en borde inferior)
        if (this.direction === 1 ) {
          this.direction = -1; // invierte sentido
          const p0 = { x: this.x, y: this.y };
          const p1 = { x: this.x + halfWidthStreets*0.5, y: this.y + 10};
          const p2 = { x: this.x + halfWidthStreets, y: this.y };
          this.startUTurn([p0, p1, p2]);
        }
        // arriba → abajo (rebote en borde superior)
        else if (this.direction === -1 ) {
          this.direction = 1; // invierte sentido
          const p0 = { x: this.x, y: this.y };
          const p1 = { x: this.x - halfWidthStreets*0.5, y: this.y - 10 };
          const p2 = { x: this.x - halfWidthStreets, y: this.y};
          console.log("Posicion actual del coche : " + this.x + ","+this.y);
          console.log("P0 " + p0.x +","+p0.y+"  P1 " + p1.x +","+p1.y + ", P2 " + p2.x +","+p2.y);
          this.startUTurn([p0, p1, p2]);
        }
        this.startTurnU = false;
      }
    }
  }
}