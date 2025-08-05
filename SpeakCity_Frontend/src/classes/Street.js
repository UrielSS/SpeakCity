// Classes/Street.js
import * as PIXI from "pixi.js";
import { CANVAS_CONFIG, CALCULATED_VALUES} from "../utils/constants"; 

const { width: canvasWidth, height: canvasHeight, halfWidthStreets } = CANVAS_CONFIG;

// Función para crear un gráfico de calle
const createStreetGraphic = (streetDimension, color = 0x444444) => {
  let context = new PIXI.GraphicsContext().fill(color);
  let graphic = new PIXI.Graphics(context);
  graphic.stroke({ width: 1, pixelLine: true });
  graphic.rect(streetDimension[0], streetDimension[1], streetDimension[2], streetDimension[3]);
  graphic.fill(color);
  return graphic;
};

export class Street {
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