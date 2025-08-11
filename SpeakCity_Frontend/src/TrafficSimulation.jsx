// Classes/Car.js
import * as PIXI from "pixi.js";
import { CANVAS_CONFIG } from "../utils/constants";

let nextCarID = 0;
const { halfWidthStreets } = CANVAS_CONFIG;

export class Car extends PIXI.Sprite {
  static registry = new Set();

  constructor(texture, isVertical, initialPosition, direction, speed, currentStreet = null, nextStreet = null) {
    super(texture);

    this.id = nextCarID++;
    this.isVertical = isVertical;
    this.direction = direction;   // 1 (derecha/abajo), -1 (izquierda/arriba)
    this.speed = speed;
    this.isStopped = false;

    this.anchor.set(0.5, 0.5);
    this.scale.set(0.020);

    this.x = initialPosition.x;
    this.y = initialPosition.y;

    // Navegación
    this.currentStreet = currentStreet;
    this.nextStreet = nextStreet;
    this.hasChangedDirection = false;

    // Giro suave (bezier)
    this.isTurning = false;
    this.turnTime = 0;
    this.turnDuration = 30; // frames
    this.turnPath = [];
    this.turnIndex = 0;

    this.proximityBlocked = false;

    this.setCarRotation();
    Car.registry.add(this);
  }

  destroy(options) {
    Car.registry.delete(this);
    super.destroy(options);
  }

  setCarRotation() {
    if (this.isVertical) {
      this.rotation = (this.direction === 1) ? (Math.PI / 2) : (-Math.PI / 2);
    } else {
      this.rotation = (this.direction === 1) ? 0 : Math.PI;
    }
  }

  stop()  { this.isStopped = true; }
  resume(){ this.isStopped = false; }

  _laneIndex() {
    if (!this.currentStreet) return -1;
    const [sx, sy] = this.currentStreet.dimensions;
    if (this.isVertical) {
      const rel = this.x - sx;
      return (rel < halfWidthStreets) ? 0 : 1;
    } else {
      const rel = this.y - sy;
      return (rel < halfWidthStreets) ? 0 : 1;
    }
  }

  axisLength() {
    return this.width; // usando ancho escalado como “largo” efectivo
  }

  _desiredGapPx() {
    const L = this.axisLength();
    // Aumentamos colchón para giros lentos y desaceleraciones
    return Math.max(28, L * 0.85);
  }

  scanFront() {
    const laneA = this._laneIndex();
    const LhA = this.axisLength() * 0.5;

    let minGap = Infinity;
    let frontCar = null;

    for (const other of Car.registry) {
      if (other === this) continue;
      if (other.isVertical !== this.isVertical) continue;
      if (other.currentStreet !== this.currentStreet) continue;
      if (other.direction !== this.direction) continue;
      if (other._laneIndex() !== laneA) continue;

      const LhB = other.axisLength() * 0.5;

      if (!this.isVertical) {
        if (this.direction === 1 && other.x >= this.x) {
          const frontA = this.x + LhA;
          const backB  = other.x - LhB;
          const gap = backB - frontA;
          if (gap < minGap) { minGap = gap; frontCar = other; }
        }
        if (this.direction === -1 && other.x <= this.x) {
          const frontA = this.x - LhA;
          const backB  = other.x + LhB;
          const gap = frontA - backB;
          if (gap < minGap) { minGap = gap; frontCar = other; }
        }
      } else {
        if (this.direction === 1 && other.y >= this.y) {
          const frontA = this.y + LhA;
          const backB  = other.y - LhB;
          const gap = backB - frontA;
          if (gap < minGap) { minGap = gap; frontCar = other; }
        }
        if (this.direction === -1 && other.y <= this.y) {
          const frontA = this.y - LhA;
          const backB  = other.y + LhB;
          const gap = frontA - backB;
          if (gap < minGap) { minGap = gap; frontCar = other; }
        }
      }
    }
    return { gapAhead: minGap, frontCar };
  }

  safeStep(deltaTime, gapAhead) {
    const planned = Math.abs(this.speed * deltaTime);
    const desired = this._desiredGapPx();

    if (!isFinite(gapAhead)) return planned;
    if (gapAhead <= desired) return 0;

    const safeFree = gapAhead - desired;
    if (planned > safeFree) {
      // un poco más conservador para evitar jitter/encimado
      return Math.max(0, safeFree * 0.85);
    }
    return planned;
  }

  setDirectionBasedOnStreet(nextStreet) {
    if (!nextStreet) return;

    const [streetX, streetY] = nextStreet.dimensions;
    const comingFromVertical = this.isVertical;
    const goingToVertical   = (nextStreet.orientation === 'vertical');

    if (comingFromVertical && goingToVertical) {
      this.isVertical = true;
      if (this.y < streetY) {
        this.direction = 1; // baja
        this.x = streetX + halfWidthStreets / 2;
      } else {
        this.direction = -1; // sube
        this.x = streetX + halfWidthStreets / 2 + halfWidthStreets;
      }
    } else if (!comingFromVertical && !goingToVertical) {
      this.isVertical = false;
      if (this.x < streetX) {
        this.direction = 1; // derecha
        this.y = streetY + halfWidthStreets / 2;
      } else {
        this.direction = -1; // izquierda
        this.y = streetY + halfWidthStreets / 2 + halfWidthStreets;
      }
    } else if (!comingFromVertical && goingToVertical) {
      this.isVertical = true;
      if (this.direction === 1) {
        if (this.y < streetY) {
          this.direction = 1;  // baja
          this.x = streetX + halfWidthStreets / 2;
        } else {
          this.direction = -1; // sube
          this.x = streetX + halfWidthStreets / 2 + halfWidthStreets;
        }
      } else {
        if (this.y < streetY) {
          this.direction = 1;
          this.x = streetX + halfWidthStreets / 2;
        } else {
          this.direction = -1;
          this.x = streetX + halfWidthStreets / 2 + halfWidthStreets;
        }
      }
    } else if (comingFromVertical && !goingToVertical) {
      this.isVertical = false;
      if (this.direction === 1) {
        if (this.x < streetX) {
          this.direction = 1;  // derecha
          this.y = streetY + halfWidthStreets / 2;
        } else {
          this.direction = -1; // izquierda
          this.y = streetY + halfWidthStreets / 2 + halfWidthStreets;
        }
      } else {
        if (this.x < streetX) {
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

  // ---- Bezier / giros suaves ----
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

  bezierTangent(t, p0, p1, p2) {
    const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const dy = 2 * (1 - t) * (p2.y - p1.y) + 2 * (1 - t) * (p1.y - p0.y); // misma fórmula, expandida
    return { dx, dy };
  }

  update(deltaTime, appScreen) {
    const giroOffset = 20;
    const margen = 10;

    if (this.isTurning) {
      this.turnTime++;
      const t = this.turnTime / this.turnDuration;

      const p0 = this.turnPath[0];
      const p1 = this.turnPath[1];
      const p2 = this.turnPath[2];

      const { x, y } = this.bezier(t, p0, p1, p2);
      this.x = x;
      this.y = y;

      const { dx, dy } = this.bezierTangent(t, p0, p1, p2);
      this.rotation = Math.atan2(dy, dx);

      if (t >= 1) {
        this.isTurning = false;
        this.setCarRotation();
      }
      return;
    }

    if (this.isStopped) return;

    // FRENADO por proximidad en carril
    const { gapAhead } = this.scanFront();
    const step = this.safeStep(deltaTime, gapAhead);
    this.proximityBlocked = (step === 0);

    if (step > 0) {
      if (!this.isVertical) {
        this.x += this.direction * step;

        if (this.direction === 1 && this.x > appScreen.width - margen) {
          this.direction = -1;
          const p0 = { x: this.x, y: this.y };
          const p1 = { x: this.x + 20, y: this.y + 40 };
          const p2 = { x: appScreen.width - margen - giroOffset, y: this.y + halfWidthStreets };
          this.startUTurn([p0, p1, p2]);
        } else if (this.direction === -1 && this.x < margen) {
          this.direction = 1;
          const p0 = { x: this.x, y: this.y };
          const p1 = { x: this.x - 20, y: this.y - 40 };
          const p2 = { x: margen + giroOffset, y: this.y - halfWidthStreets };
          this.startUTurn([p0, p1, p2]);
        }
      } else {
        this.y += this.direction * step;

        if (this.direction === 1 && this.y > appScreen.height - margen) {
          this.direction = -1;
          const p0 = { x: this.x, y: this.y };
          const p1 = { x: this.x + 40, y: this.y + 20 };
          const p2 = { x: this.x + halfWidthStreets, y: appScreen.height - margen - giroOffset };
          this.startUTurn([p0, p1, p2]);
        } else if (this.direction === -1 && this.y < margen) {
          this.direction = 1;
          const p0 = { x: this.x, y: this.y };
          const p1 = { x: this.x - 40, y: this.y - 20 };
          const p2 = { x: this.x - halfWidthStreets, y: margen + giroOffset };
          this.startUTurn([p0, p1, p2]);
        }
      }
    }
  }
}
