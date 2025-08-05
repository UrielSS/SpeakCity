export const CANVAS_CONFIG = {
  width: 700,
  height: 500,
  hortBlocks: 4,
  vertBlocks: 4,
  halfWidthStreets: 15
};

export const CALCULATED_VALUES = {
  wVS: Math.floor(CANVAS_CONFIG.width / CANVAS_CONFIG.vertBlocks),
  wHS: Math.floor(CANVAS_CONFIG.height / CANVAS_CONFIG.hortBlocks)
};