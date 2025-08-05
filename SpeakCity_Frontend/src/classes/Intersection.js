// Classes/Intersection.js
import * as PIXI from "pixi.js";

// Función para crear un gráfico de calle
const createStreetGraphic = (streetDimension, color = 0x444444) => {
  let context = new PIXI.GraphicsContext().fill(color);
  let graphic = new PIXI.Graphics(context);
  graphic.stroke({ width: 1, pixelLine: true });
  graphic.rect(streetDimension[0], streetDimension[1], streetDimension[2], streetDimension[3]);
  graphic.fill(color);
  return graphic;
};

export class Intersection {
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