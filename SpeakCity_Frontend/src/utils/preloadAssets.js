// Utils/preloadAssets.js
import * as PIXI from "pixi.js";

export const preloadAssets = async () => {
  const assets = [
    { alias: 'street', src: "/assets/street_texture.png" },
    { alias: 'grass_bg', src: "assets/grass.png" },
    { alias: 'city1_bg', src: "assets/city1.png" },
    { alias: 'building', src: "assets/building1.png" },
    { alias: 'complex1', src: "/assets/complex1.png" },
    { alias: 'complex2', src: "/assets/complex2.png" },
    { alias: 'complex3', src: "/assets/complex3.png" },
    { alias: 'complex4', src: "/assets/complex4.png" },
    { alias: 'complex5', src: "/assets/complex5.png" },
    { alias: 'complex6', src: "/assets/complex6.png" },
    { alias: 'complex7', src: "/assets/complex7.png" },
    { alias: 'car1', src: "/assets/car1.png" },
    { alias: 'car2', src: "/assets/car2.png" },
    { alias: 'car3', src: "/assets/car3.png" },
    { alias: 'car4', src: "/assets/car4.png" },
    { alias: 'car5', src: "/assets/car5.png" }
  ];
  await PIXI.Assets.load(assets);
};