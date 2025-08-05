// Classes/Car.js
import * as PIXI from "pixi.js";

let nextCarID = 0;

export class Car extends PIXI.Sprite {
  constructor(texture, isVertical, initialPosition, direction, speed) {
    super(texture);
    
    this.id = nextCarID++;
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