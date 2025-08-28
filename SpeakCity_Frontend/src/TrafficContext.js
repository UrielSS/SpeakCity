import { createContext } from 'react';

export const TrafficContext = createContext({
  closeStreet: () => {},
  openStreet: () => {},
  changeTrafficLight_red: () => {},
  changeTrafficLight_green: () => {},
  deactivateTrafficLight: () => {},
  activateTrafficLight: () => {},
  changeTrafficLightTimeInterval: () => {},
  openAllStreets: () => {},
  changeDensity: () => {},
  closePeriferico: () => {},
  openPeriferico: () => {},
});