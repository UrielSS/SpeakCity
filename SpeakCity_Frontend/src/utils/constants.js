export const CANVAS_CONFIG = {
  width: 800,
  height: 600,
  hortBlocks: 4,
  vertBlocks: 4,
  halfWidthStreets: 15
};

export const CALCULATED_VALUES = {
  wVS: Math.floor((CANVAS_CONFIG.width - 2 * CANVAS_CONFIG.halfWidthStreets) / CANVAS_CONFIG.vertBlocks),
  wHS: Math.floor((CANVAS_CONFIG.height - 2 * CANVAS_CONFIG.halfWidthStreets) / CANVAS_CONFIG.hortBlocks)
};