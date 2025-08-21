// Classes/Car.js
import * as PIXI from "pixi.js";
import { CANVAS_CONFIG} from "../utils/constants";
let nextCarID = 0;
const { halfWidthStreets, width, height } = CANVAS_CONFIG;

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

    // Variables para el giro en U
    this.startTurnU = false;
    this.isTurning = false;
    this.turnTime = 0;
    this.turnDuration = 30;
    this.turnPath = [];
    this.turnIndex = 0;
    
    //Variables para evitar ciclos infinitos
    this.lastUTurnTime = 0;
    this.uTurnCooldown = 100; // Frames de cooldown entre giros en U
    this.uTurnCount = 0;
    this.maxConsecutiveUTurns = 2; // Máximo número de giros en U consecutivos
    this.lastUTurnPosition = { x: 0, y: 0 };
    this.uTurnDistanceThreshold = 50; // Distancia mínima para resetear contador

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

  //Método para verificar si puede hacer un giro en U
  canPerformUTurn(currentTime) {
    // Verificar cooldown
    //cooldown es el tiempo mínimo entre giros en U
    if (currentTime - this.lastUTurnTime < this.uTurnCooldown) {
      return false;
    }

    // Verificar si ha hecho demasiados giros consecutivos
    if (this.uTurnCount >= this.maxConsecutiveUTurns) {
      return false;
    }

    // Verificar si está muy cerca de la última posición de giro en U para evitar ciclos infinitos
    const distance = Math.sqrt(
      Math.pow(this.x - this.lastUTurnPosition.x, 2) + 
      Math.pow(this.y - this.lastUTurnPosition.y, 2)
    );
    
    if (distance < this.uTurnDistanceThreshold && this.uTurnCount > 0) {
      return false;
    }
    return true;
  }

  //Resetear contador de giros en U cuando el coche se mueva significativamente
  updateUTurnCounter() {
    const distance = Math.sqrt(
      Math.pow(this.x - this.lastUTurnPosition.x, 2) + 
      Math.pow(this.y - this.lastUTurnPosition.y, 2)
    );
    
    if (distance > this.uTurnDistanceThreshold * 2) {
      this.uTurnCount = 0;
    }
  }

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
  getDistanceToCarAhead(otherCar) {
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

    // Solo activar giro en U si realmente es necesario
    if (nextStreet === this.currentStreet) {
      // Verificar si puede hacer el giro en U
      if (this.canPerformUTurn(Date.now())) {
        console.log(`Coche ${this.id}: Iniciando giro en U`);
        this.startTurnU = true;
        this.lastUTurnTime = Date.now();
        this.uTurnCount++;
        this.lastUTurnPosition = { x: this.x, y: this.y };
      } else {
        console.log(`Coche ${this.id}: Giro en U bloqueado por cooldown o límite`);
        // Si no puede hacer giro en U, detener el coche temporalmente
        this.stopByTraffic();
      }
      return;
    }

    const [streetX, streetY, streetWidth, streetHeight] = nextStreet.dimensions;
    const comingFromVertical = this.isVertical;
    const goingToVertical = (nextStreet.orientation === 'vertical');

    // Giro de horizontal -> vertical
    if (!comingFromVertical && goingToVertical) {
      this.isVertical = true;
      if (this.direction === 1) {
        // venía de la izquierda
        if (this.y < streetY ) {
          this.direction = 1;
          this.x = streetX + halfWidthStreets / 2;
        } else {
          this.direction = -1;
          this.x = streetX + halfWidthStreets / 2 + halfWidthStreets;
        }
      } else {
        if (this.y < (streetY + 10)) {
          this.direction = 1;
          this.x = streetX + halfWidthStreets / 2;
        } else {
          this.direction = -1;
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
          this.direction = 1;
          this.y = streetY + halfWidthStreets / 2;
        } else {
          this.direction = -1;
          this.y = streetY + halfWidthStreets / 2 + halfWidthStreets;
        }
      } else {
        if (this.x < (streetX + 10)) {
          this.direction = 1;
          this.y = streetY + halfWidthStreets / 2;
        } else {
          this.direction = -1;
          this.y = streetY + halfWidthStreets / 2 + halfWidthStreets;
        }
      }
    }

    this.setCarRotation();
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
    console.log(`Coche ${this.id}: Ejecutando giro en U desde (${this.x}, ${this.y})`);
  }

  update(deltaTime, appScreen) {
    // Actualizar contador de giros en U
    this.updateUTurnCounter();

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
        //Reset startTurnU después de completar el giro
        this.startTurnU = false;
        console.log(`Coche ${this.id}: Giro en U completado en (${this.x}, ${this.y})`);
      }
      return;
    }

    if (this.isStopped) return;

    if (!this.isVertical) {
      // Horizontal
      this.x += this.speed * this.direction * deltaTime;

      // Evitar que los coches salgan del mapa
      if (this.x < 0) {
        this.x = this.x + 50;
        console.log("coche " + this.id + " saliendo del mapa");
      } else if (this.x > width) {
        this.x = this.x - 50;
        console.log("coche " + this.id + " saliendo del mapa");
      }

      // Giro en U horizontal
      if (this.startTurnU) {
        console.log(`Coche ${this.id}: Procesando giro en U horizontal`);
        this.startTurnU = false;

        if (this.direction === 1) { // derecha → izquierda
          this.direction = -1;
          const p0 = { x: this.x, y: this.y };
          const p1 = { x: this.x + 15, y: this.y + halfWidthStreets * 0.6 };
          const p2 = { x: this.x - 5, y: this.y + halfWidthStreets };
          this.startUTurn([p0, p1, p2]);
        } else if (this.direction === -1) { // izquierda → derecha
          this.direction = 1;
          const p0 = { x: this.x, y: this.y };
          const p1 = { x: this.x - 15, y: this.y - halfWidthStreets * 0.6 };
          const p2 = { x: this.x + 5, y: this.y - halfWidthStreets };
          this.startUTurn([p0, p1, p2]);
        }
        //eliminé el cambio de estado en giro U
      }
    } else {
      // Vertical
      this.y += this.speed * this.direction * deltaTime;

      // Evitar que los coches salgan del mapa
      if (this.y < 0) {
        this.y = this.y + 50;
        console.log("coche " + this.id + " saliendo del mapa");
      } else if (this.y > height) {
        this.y = this.y - 50;
        console.log("coche " + this.id + " saliendo del mapa");
      }

      // Giro en U vertical
      if (this.startTurnU) {
        console.log(`Coche ${this.id}: Procesando giro en U vertical`);
        this.startTurnU = false;

        if (this.direction === 1) { // abajo → arriba
          this.direction = -1;
          const p0 = { x: this.x, y: this.y };
          const p1 = { x: this.x + halfWidthStreets * 0.6, y: this.y + 15 };
          const p2 = { x: this.x + halfWidthStreets, y: this.y - 5 };
          this.startUTurn([p0, p1, p2]);
        } else if (this.direction === -1) { // arriba → abajo
          this.direction = 1;
          const p0 = { x: this.x, y: this.y };
          const p1 = { x: this.x - halfWidthStreets * 0.6, y: this.y - 15 };
          const p2 = { x: this.x - halfWidthStreets, y: this.y + 5 };
          this.startUTurn([p0, p1, p2]);
        }
      }
    }
  }
}