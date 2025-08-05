// Classes/TrafficLight.js
import * as PIXI from "pixi.js";

export class TrafficLight {
  constructor(intersection, direction, streetContainer) {
    this.intersection = intersection;
    this.direction = direction;
    this.container = streetContainer;
    this.state = 'green'; // Estado inicial
    this.timer = null;

    this.circle = new PIXI.Graphics();
    this.container.addChild(this.circle);
    this.draw();
  }

  getPosition() {
    const [x, y, w, h] = this.intersection.dimensions;

    const offset = 10;
    switch (this.direction) {
      case 'top':
        return { x: x + w / 2, y: y - offset };
      case 'bottom':
        return { x: x + w / 2, y: y + h + offset };
      case 'left':
        return { x: x - offset, y: y + h / 2 };
      case 'right':
        return { x: x + w + offset, y: y + h / 2 };
    }
  }

  draw() {
    this.circle.clear();
    const color = this.state === 'green' ? 0x00ff00 : 0xff0000;
    const { x, y } = this.getPosition();

    this.circle.beginFill(color, 0.5);
    this.circle.drawCircle(x, y, 8);
    this.circle.endFill();
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this.draw();
  }

  toggle() {
    this.setState(this.state === 'green' ? 'red' : 'green');
  }

  startTimer(interval = 6000) {
    this.timer = setInterval(() => this.toggle(), interval);
  }

  stopTimer() {
    clearInterval(this.timer);
  }

  isRed() {
    return this.state === 'red';
  }

  getStopZone() {
    const [x, y, w, h] = this.intersection.dimensions;
    const margin = 20;

    switch (this.direction) {
      case 'top':
        return new PIXI.Rectangle(x, y - margin, w, margin);
      case 'bottom':
        return new PIXI.Rectangle(x, y + h, w, margin);
      case 'left':
        return new PIXI.Rectangle(x - margin, y, margin, h);
      case 'right':
        return new PIXI.Rectangle(x + w, y, margin, h);
    }
  }
}