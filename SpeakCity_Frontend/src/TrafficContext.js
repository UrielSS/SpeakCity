// TrafficContext.js
import { createContext } from 'react';

export const TrafficContext = createContext({
  closeStreet: () => {},
  openStreet: () => {},
});