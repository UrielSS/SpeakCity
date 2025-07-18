import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

const CityCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const setupApp = async () => {
      // Inicializar PixiJS con tamaño fijo
      const app = new PIXI.Application();
      await app.init({
        width: 1000,
        height: 700,
        backgroundColor: 0x0a0a0a,
        antialias: true,
      });

      canvasRef.current.appendChild(app.canvas);

      // Cargar todas las texturas
      const [cityBg, roadHTex, roadVTex, carRed, carBlue, carYellow, carGreen] = await Promise.all([
        PIXI.Assets.load('/img/ciudad.png'),
        PIXI.Assets.load('/img/horizontal.png'),
        PIXI.Assets.load('/img/vertical.png'),
        PIXI.Assets.load('/img/car_red.png'),
        PIXI.Assets.load('/img/car_blue.png'),
        PIXI.Assets.load('/img/car_yellow.png'),
        PIXI.Assets.load('/img/car_green.png'),
      ]);

      // Configurar capas (orden z-index)
      const bgLayer = new PIXI.Container();
      const roadLayer = new PIXI.Container();
      const carLayer = new PIXI.Container();
      app.stage.addChild(bgLayer);
      app.stage.addChild(roadLayer);
      app.stage.addChild(carLayer);

      // Añadir fondo de ciudad
      const background = new PIXI.Sprite(cityBg);
      background.width = app.screen.width;
      background.height = app.screen.height;
      bgLayer.addChild(background);

      // Configuración de calles
      const roadConfig = {
        horizontal: {
          count: 3,
          spacing: app.screen.height / 4,
          width: app.screen.width,
          height: 50,
          texture: roadHTex
        },
        vertical: {
          count: 4,
          spacing: app.screen.width / 5,
          width: 60,
          height: app.screen.height,
          texture: roadVTex
        }
      };

      // Crear carreteras
      createRoads(roadLayer, app.screen, roadConfig);

      // Configuración de autos
      const carConfig = {
        sizes: {
          horizontal: { width: 70, height: 45 },  // Proporción 2:1
          vertical: { width: 45, height: 70 }    // Proporción 1:2
        },
        horizontalTextures: [carRed, carGreen],
        verticalTextures: [carYellow, carBlue],
        maxCarsPerRoad: 3,
        minSpeed: 0.8,
        maxSpeed: 1.8
      };

      // Crear autos
      createCars(carLayer, app, roadConfig, carConfig);

      return () => {
        app.destroy(true);
      };
    };

    setupApp().catch(console.error);
  }, []);

  // Función para crear carreteras
  const createRoads = (layer, screen, config) => {
    // Calles horizontales (5)
    for (let i = 0; i < config.horizontal.count; i++) {
      const y = config.horizontal.spacing * (i + 1);
      const road = new PIXI.TilingSprite(
        config.horizontal.texture,
        config.horizontal.width,
        config.horizontal.height
      );
      road.position.set(0, y - config.horizontal.height / 2);
      layer.addChild(road);
    }

    // Calles verticales (4)
    for (let i = 0; i < config.vertical.count; i++) {
      const x = config.vertical.spacing * (i + 1);
      const road = new PIXI.TilingSprite(
        config.vertical.texture,
        config.vertical.width,
        config.vertical.height
      );
      road.position.set(x - config.vertical.width / 2, 0);
      layer.addChild(road);
    }
  };

  // Función para crear autos
  const createCars = (layer, app, roadConfig, carConfig) => {
    // Autos horizontales
    for (let i = 0; i < roadConfig.horizontal.count; i++) {
      const y = roadConfig.horizontal.spacing * (i + 1);
      const carCount = Math.floor(Math.random() * carConfig.maxCarsPerRoad) + 1;
      
      for (let j = 0; j < carCount; j++) {
        const texture = carConfig.horizontalTextures[
          Math.floor(Math.random() * carConfig.horizontalTextures.length)
        ];
        const car = new PIXI.Sprite(texture);
        
        // Tamaño proporcional al carril
        car.width = carConfig.sizes.horizontal.width;
        car.height = carConfig.sizes.horizontal.height;
        
        // Posición inicial con espacio entre autos
        const spacing = app.screen.width / (carCount + 1);
        const x = (spacing * (j + 1)) - (car.width / 2) + (Math.random() * 100 - 50);
        
        car.position.set(
          x,
          y - car.height / 2
        );
        
        // Velocidad aleatoria dentro del rango
        const speed = Math.random() * 
          (carConfig.maxSpeed - carConfig.minSpeed) + carConfig.minSpeed;
        
        layer.addChild(car);
        
        // Animación del auto
        app.ticker.add(() => {
          car.x += speed;
          if (car.x > app.screen.width + car.width) {
            car.x = -car.width;
          }
        });
      }
    }
    
    // Autos verticales
    for (let i = 0; i < roadConfig.vertical.count; i++) {
      const x = roadConfig.vertical.spacing * (i + 1);
      const carCount = Math.floor(Math.random() * carConfig.maxCarsPerRoad) + 1;
      
      for (let j = 0; j < carCount; j++) {
        const texture = carConfig.verticalTextures[
          Math.floor(Math.random() * carConfig.verticalTextures.length)
        ];
        const car = new PIXI.Sprite(texture);
        
        // Tamaño proporcional al carril
        car.width = carConfig.sizes.vertical.width;
        car.height = carConfig.sizes.vertical.height;
        
        // Posición inicial con espacio entre autos
        const spacing = app.screen.height / (carCount + 1);
        const y = (spacing * (j + 1)) - (car.height / 2) + (Math.random() * 100 - 50);
        
        car.position.set(
          x - car.width / 2,
          y
        );
        
        // Velocidad aleatoria dentro del rango
        const speed = Math.random() * 
          (carConfig.maxSpeed - carConfig.minSpeed) + carConfig.minSpeed;
        
        layer.addChild(car);
        
        // Animación del auto
        app.ticker.add(() => {
          car.y += speed;
          if (car.y > app.screen.height + car.height) {
            car.y = -car.height;
          }
        });
      }
    }
  };

  return (
    <div ref={canvasRef} style={{
      borderRadius: '10px',
      overflow: 'hidden',
      boxShadow: '0 0 20px rgba(0,0,0,0.5)'
    }} />
  );
};

export default CityCanvas;