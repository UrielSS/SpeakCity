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

    this.anchor.set(0.5,0.5);
    this.scale.set(0.020);

    this.x = initialPosition.x;
    this.y = initialPosition.y;

    this.setCarRotation();

    this.currentStreet = currentStreet;
    this.nextStreet = nextStreet;
    this.hasChangedDirection = false;

    this.isTurning = false;
    this.turnTime = 0;
    this.turnDuration = 30;
    this.turnPath = [];
    this.turnIndex = 0;
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


  setDirectionBasedOnStreet(nextStreet) {
    if (!nextStreet) return;

    const [streetX, streetY, streetWidth, streetHeight] = nextStreet.dimensions;
    const comingFromVertical = this.isVertical;
    const goingToVertical = (nextStreet.orientation === 'vertical');

    // Giro de horizontal -> vertical
    if (!comingFromVertical && goingToVertical) {
      this.isVertical = true;
      if (this.direction === 1) {
        // venía de la izquierda
        if (this.y < streetY) {
          this.direction = 1; // gira abajo
          this.x = streetX + halfWidthStreets / 2;                // carril baja
        } else {
          this.direction = -1; // gira arriba
          this.x = streetX + halfWidthStreets / 2 + halfWidthStreets; // carril sube
        }
      } else {
        // venía de la derecha
        if (this.y < streetY) {
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
        if (this.x < streetX) {
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

  // NUeva función para calcular la tangente de la curva cuadrática
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
    const giroOffset = 20;
    const margen = 10;

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


    //Quité todos los scale.x *= -1 y scale.y *= -1
    if (!this.isVertical) {
      // Horizontal
      this.x += this.speed * this.direction * deltaTime;

      // derecha → izquierda (rebote en borde derecho)
      if (this.direction === 1 && this.x > appScreen.width - margen) {
        this.direction = -1; // invierte sentido
        const p0 = { x: this.x, y: this.y };
        const p1 = { x: this.x + 20, y: this.y + 40 }; // control para curvar
        const p2 = { x: appScreen.width - margen - giroOffset, y: this.y + halfWidthStreets };
        this.startUTurn([p0, p1, p2]);
      }
      // izquierda → derecha (rebote en borde izquierdo)
      else if (this.direction === -1 && this.x < margen) {
        this.direction = 1; // invierte sentido
        const p0 = { x: this.x, y: this.y };
        const p1 = { x: this.x - 20, y: this.y - 40 };
        const p2 = { x: margen + giroOffset, y: this.y - halfWidthStreets };
        this.startUTurn([p0, p1, p2]);
      }
    } else {
      // Vertical
      this.y += this.speed * this.direction * deltaTime;

      // abajo → arriba (rebote en borde inferior)
      if (this.direction === 1 && this.y > appScreen.height - margen) {
        this.direction = -1; // invierte sentido
        const p0 = { x: this.x, y: this.y };
        const p1 = { x: this.x + 40, y: this.y + 20 };
        const p2 = { x: this.x + halfWidthStreets, y: appScreen.height - margen - giroOffset };
        this.startUTurn([p0, p1, p2]);
      }
      // arriba → abajo (rebote en borde superior)
      else if (this.direction === -1 && this.y < margen) {
        this.direction = 1; // invierte sentido
        const p0 = { x: this.x, y: this.y };
        const p1 = { x: this.x - 40, y: this.y - 20 };
        const p2 = { x: this.x - halfWidthStreets, y: margen + giroOffset };
        this.startUTurn([p0, p1, p2]);
      }
    }
  }
}