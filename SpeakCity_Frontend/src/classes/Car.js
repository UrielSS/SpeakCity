// Classes/Car.js
import * as PIXI from "pixi.js";
import { CANVAS_CONFIG, CALCULATED_VALUES } from "../utils/constants";
let nextCarID = 0;
const { halfWidthStreets } = CANVAS_CONFIG;

export class Car extends PIXI.Sprite {
  constructor(texture, isVertical, initialPosition, direction, speed, currentStreet= null, nextStreet = null) {
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

    //Atributos para controlar la ruta de los coches sobre el canvas
    this.currentStreet = currentStreet;
    this.nextStreet = nextStreet;
    this.hasChangedDirection = false;

    this.isTurning = false;
    this.turnTime = 0;
    this.turnDuration = 30; // frames, ajustable
    this.turnPath = []; // puntos de la curva
    this.turnIndex = 0;
  }

  setCarRotation() {
    if (this.isVertical) {
      if (this.direction === 1) {
        // Abajo
        this.rotation = Math.PI / 2;
        
      } else {
        // Arriba
        this.rotation = -Math.PI / 2;
      }
    } else {
      if (this.direction === 1) {
        // Derecha
        this.rotation = 0;
      } else {
        // Izquierda
        this.rotation = Math.PI;
      }
    }
  }

  stop() {
    this.isStopped = true;
  }

  resume() {
    this.isStopped = false;
  }

  setDirectionBasedOnStreet(nextStreet) {
    if (!nextStreet) return;

    const [streetX, streetY, streetWidth, streetHeight] = nextStreet.dimensions;

    const comingFromVertical = this.isVertical;
    const goingToVertical = (nextStreet.orientation === 'vertical');


    // ===== CASO 1: seguir recto =====
    // if (comingFromVertical && goingToVertical) {
    //   // Mantener dirección vertical
    //   this.isVertical = true;
    //   if (this.y < streetY) {
    //     this.direction = 1; // bajada
    //     //this.x = streetX + halfWidthStreets/2;
    //   } else {
    //     this.direction = -1; // subida
    //     //this.x = streetX + halfWidthStreets/2;
    //   }
    // }
    // else if (!comingFromVertical && !goingToVertical) {
    //   // Mantener dirección horizontal
    //   this.isVertical = false;
    //   if (this.x < streetX) {
    //     this.direction = 1; // derecha
    //     //this.y = streetY;
    //   } else {
    //     this.direction = -1; // izquierda
    //     //this.y = streetY + halfWidthStreets/2;;
    //   }
    // }

    // ===== CASO 2: giro de horizontal → vertical =====
     if (!comingFromVertical && goingToVertical) {
      this.isVertical = true;
      if (this.direction === 1) {
        // venía de la izquierda
        if (this.y < streetY) {
          this.direction = 1; // gira abajo
          this.x = streetX + halfWidthStreets/2;; // carril bajada
        } else {
          this.direction = -1; // gira arriba
          this.x = streetX +halfWidthStreets/2 + halfWidthStreets; // carril subida
        }
      } else {
        // venía de la derecha
        if (this.y < streetY) {
          this.direction = 1; // gira abajo
          this.x = streetX +halfWidthStreets/2;;
        } else {
          this.direction = -1; // gira arriba
          this.x = streetX +halfWidthStreets/2 + halfWidthStreets;
        }
      }
    }

    // ===== CASO 3: giro de vertical → horizontal =====
    else if (comingFromVertical && !goingToVertical) {
      this.isVertical = false;
      if (this.direction === 1) {
        // venía de arriba
        if (this.x < streetX) {
          this.direction = 1; // gira derecha
          this.y = streetY +halfWidthStreets/2;; // carril derecho
        } else {
          this.direction = -1; // gira izquierda
          this.y = streetY +halfWidthStreets/2 + halfWidthStreets; // carril izquierdo
        }
      } else {
        // venía de abajo
        if (this.x < streetX) {
          this.direction = 1; // gira derecha
          this.y = streetY +halfWidthStreets/2;;
        } else {
          this.direction = -1; // gira izquierda
          this.y = streetY +halfWidthStreets/2 + halfWidthStreets;
        }
      }
    }
    this.setCarRotation();
  }

  startUTurn(pathPoints) {
    this.isTurning = true;
    this.turnPath = pathPoints;
    this.turnIndex = 0;
    this.turnTime = 0;
  }


  bezier(t, p0, p1, p2) {
    const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x;
    const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y;
    return { x, y };
  }


  update(deltaTime, appScreen) {
    const giroOffset = 20;
    const margen = 10;

    if (this.isTurning) {
      this.turnTime++;
      const t = this.turnTime / this.turnDuration;
      const { x, y } = this.bezier(
        t,
        this.turnPath[0],
        this.turnPath[1],
        this.turnPath[2]
      );
      this.x = x;
      this.y = y;

      const angle = Math.atan2(
        this.turnPath[2].y - this.turnPath[0].y,
        this.turnPath[2].x - this.turnPath[0].x
      );
      this.rotation = angle;

      if (t >= 1) {
        this.isTurning = false;

        if (this.isVertical) {
          this.rotation = this.direction === 1 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          this.rotation = 0;
        }
        
      }
      return;
    }

    if (this.isStopped) return;

    if (!this.isVertical) {
      this.x += this.speed * this.direction * deltaTime;

      // derecha → izquierda
      if (this.direction === 1 && this.x > appScreen.width - margen) {
        this.direction = -1;
        this.scale.x *= -1;

        const p0 = { x: this.x, y: this.y };
        const p1 = { x: this.x + 20, y: this.y + 40 }; // control (curva)
        const p2 = { x: appScreen.width - margen - giroOffset, y: this.y + halfWidthStreets };

        this.startUTurn([p0, p1, p2]);
      }
      // izquierda → derecha
      else if (this.direction === -1 && this.x < margen) {
        this.direction = 1;
        this.scale.x *= -1;

        const p0 = { x: this.x, y: this.y };
        const p1 = { x: this.x - 20, y: this.y - 40 };
        const p2 = { x: margen + giroOffset, y: this.y - halfWidthStreets };

        this.startUTurn([p0, p1, p2]);
      }
    } else {
      this.y += this.speed * this.direction * deltaTime;

      // abajo → arriba
      if (this.direction === 1 && this.y > appScreen.height - margen) {
        this.direction = -1;
        this.scale.x *= -1;

        const p0 = { x: this.x, y: this.y };
        const p1 = { x: this.x + 40, y: this.y + 20 };
        const p2 = { x: this.x + halfWidthStreets, y: appScreen.height - margen - giroOffset };

        this.startUTurn([p0, p1, p2]);
      }
      // arriba → abajo
      else if (this.direction === -1 && this.y < margen) {
        this.direction = 1;
        this.scale.x *= -1;
      

        const p0 = { x: this.x, y: this.y };
        const p1 = { x: this.x - 40, y: this.y - 20 };
        const p2 = { x: this.x - halfWidthStreets, y: margen + giroOffset };

        this.startUTurn([p0, p1, p2]);
      }
    }
  }
}