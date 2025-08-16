// Utils/utils.js
import * as PIXI from "pixi.js";
import { Street } from "../Classes/Street";
import { Intersection } from "../Classes/Intersection";
import { CANVAS_CONFIG, CALCULATED_VALUES, EXCLUDED_STREETS} from "../utils/constants"; 

const { width: canvasWidth, height: canvasHeight, hortBlocks, vertBlocks, halfWidthStreets } = CANVAS_CONFIG;
const { wVS, wHS } = CALCULATED_VALUES;
const excludedStreets = EXCLUDED_STREETS;

// Función para verificar la intersección de dos rectángulos
export const areRectanglesIntersecting = (rect1, rect2) => {
  return rect1.x < rect2.x + rect2.width &&
         rect1.x + rect1.width > rect2.x &&
         rect1.y < rect2.y + rect2.height &&
         rect1.y + rect1.height > rect2.y;
};

export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const drawStreets = (container, streetsMap) => {
  // Calles horizontales
  for (let i = 0; i <= hortBlocks; i++) {
    for (let j = 0; j < vertBlocks; j++) {
      const streetId = "H" + i + j;
      // Solo crear la calle si no está en la lista de excluidas
      if (!excludedStreets.has(streetId)) {
        let streetDimension = [j * wVS + halfWidthStreets, wHS * i, wVS, 2 * halfWidthStreets];
        const street = new Street(streetId, streetDimension, 'horizontal', container);
        streetsMap.set(streetId, street);
      }
    }
  }

  // Calles verticales
  for (let i = 0; i <= vertBlocks; i++) {
    for (let j = 0; j < hortBlocks; j++) {
      const streetId = "V" + i + j;
      // Solo crear la calle si no está en la lista de excluidas
      if (!excludedStreets.has(streetId)) {
        let streetDimension = [wVS * i, j * wHS + halfWidthStreets, 2 * halfWidthStreets, wHS];
        const street = new Street(streetId, streetDimension, 'vertical', container);
        streetsMap.set(streetId, street);
      }
    }
  }
  
  // // Calles perimetrales
  // let topStreet = new Street("H_top", 
  //   [2 * halfWidthStreets, 0, canvasWidth - 4 * halfWidthStreets, 2 * halfWidthStreets], 
  //   'horizontal', container);
  // streetsMap.set("H_top", topStreet);

  // let bottomStreet = new Street("H_bottom", 
  //   [2 * halfWidthStreets, canvasHeight - 2 * halfWidthStreets, canvasWidth - 4 * halfWidthStreets, 2 * halfWidthStreets], 
  //   'horizontal', container);
  // streetsMap.set("H_bottom", bottomStreet);

  // let leftStreet = new Street("V_left", 
  //   [0, 2 * halfWidthStreets, 2 * halfWidthStreets, canvasHeight - 4 * halfWidthStreets], 
  //   'vertical', container);
  // streetsMap.set("V_left", leftStreet);

  // let rightStreet = new Street("V_right", 
  //   [canvasWidth - 2 * halfWidthStreets, 2 * halfWidthStreets, 2 * halfWidthStreets, canvasHeight - 4 * halfWidthStreets], 
  //   'vertical', container);
  // streetsMap.set("V_right", rightStreet);
};

export const drawIntersections = (container, intersectionsMap) => {
  const excludedIntersections = ["I12"];
  
  for (let i = 0; i <= hortBlocks; i++) {
    for (let j = 0; j <= vertBlocks; j++) {
      const intersectionId = "I" + i + j;
      // Evitar dibujar intersecciones
      if (!excludedIntersections.includes(intersectionId)) {
        let intersectionDimension = [j * wVS, wHS * i, 2 * halfWidthStreets, 2 * halfWidthStreets];
        const intersection = new Intersection(intersectionId, intersectionDimension, container);
        intersectionsMap.set(intersectionId, intersection);
      }
    }
  }
};

export const setComplex = (container) => {
  for (let i = 0; i < vertBlocks; i++) {
    for (let j = 0; j < hortBlocks; j++) {
      const spriteBlock = PIXI.Sprite.from('complex' + (1 + Math.floor(Math.random() * 7)));
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
};

export const setNameStreets = (allStreets, container) => {
  console.log(allStreets);
  allStreets.forEach((value, key) => {
    console.log(`${key}: ${value.dimensions}`);
    const html = new PIXI.HTMLText({
      text: `${key}`,
      style: {
        fontFamily: 'Arial',
        fontSize: 15,
        fill: '#ffffffff',
        align: 'center',
      },
    });
    
    if (value.orientation == "vertical"){
      html.x = value.dimensions[0];
      html.y = value.dimensions[1] + value.dimensions[3] / 2;
    } else {
      html.x = value.dimensions[0] + value.dimensions[2] / 2;
      html.y = value.dimensions[1];
    }
    container.addChild(html);
  });
};