# 🏙️ SpeakCity - Sistema de Control de Tráfico Urbano con IA

Una aplicación web moderna para gestionar el tráfico urbano mediante comandos de voz procesados por inteligencia artificial.

## ✨ Características

- **🎨 Diseño Moderno**: Interfaz elegante con gradientes pastel
- **🤖 IA Integrada**: Procesamiento de comandos con Google Gemini AI
- **📱 Responsive**: Funciona perfectamente en desktop, tablet y móvil
- **🔄 Modo Demo**: Funciona sin API key para pruebas
- **⚡ Tiempo Real**: Respuestas instantáneas del sistema
- **🎯 Comandos Específicos**: Control de semáforos, flujo vehicular e incidentes

## 🚀 Instalación Rápida

### 1. Clonar el repositorio
```bash
git clone <tu-repositorio>
cd SpeakCity
```

### 2. Configurar el Backend (Usar entorno virtual)
```bash
cd SpeakCity_Backend

# Instalar dependencias
pip install -r requirements.txt

# Configurar API key (opcional)
cp config.env.example .env
# Editar .env y agregar tu GOOGLE_API_KEY
```

### 3. Configurar el Frontend
```bash
cd ../SpeakCity_Frontend

# Instalar dependencias
npm install
```

## 🎮 Uso

### Iniciar el Backend
```bash
cd SpeakCity_Backend
python3 main.py
```
El servidor se iniciará en `http://localhost:5000`

### Iniciar el Frontend
```bash
cd SpeakCity_Frontend
npm run dev
```
La aplicación se abrirá en `http://localhost:5173` o `http://localhost:5174`

## 🔧 Configuración

### API Key de Google (Opcional)
Para usar IA real en lugar del modo demo:

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea una nueva API key
3. Edita `SpeakCity_Backend/config.env`:
```env
GOOGLE_API_KEY=tu_api_key_aqui
```

### Variables de Entorno
```env
# Backend
GOOGLE_API_KEY=tu_api_key_aquí
```

## 💡 Comandos de Ejemplo

### Semáforos
- `"cambiar semáforo en V1 por congestión"`
- `"activar semáforo en H2"`
- `"programar semáforo en V3"`

### Flujo Vehicular
- `"cerrar carril en H2 por mantenimiento"`
- `"abrir carril en V1"`
- `"redirigir tráfico en V4"`

### Incidentes
- `"reportar accidente en V3"`
- `"limpiar incidente en H1"`
- `"bloquear vía en V2"`

### Emergencias
- `"activar emergencia en H3"`
- `"via de emergencia en V1"`

## 🏗️ Arquitectura

### Backend (Flask + Python)
- **Framework**: Flask con CORS habilitado
- **IA**: Google Gemini 2.0 Flash
- **Validación**: Pydantic para esquemas
- **Logging**: Sistema de logs completo

### Frontend (React + Vite)
- **Framework**: React 18 con hooks
- **Build**: Vite para desarrollo rápido
- **Estilos**: CSS moderno con variables
- **Responsive**: Mobile-first design

## 📁 Estructura del Proyecto

```
SpeakCity/
├── SpeakCity_Backend/
│   ├── main.py              # Servidor Flask principal
│   ├── start_server.py      # Script de inicio
│   ├── requirements.txt     # Dependencias Python
│   └── config.env          # Configuración
├── SpeakCity_Frontend/
│   ├── src/
│   │   ├── App.jsx         # Componente principal
│   │   ├── ChatBox.jsx     # Interfaz de chat
│   │   ├── App.css         # Estilos principales
│   │   ├── ChatBox.css     # Estilos del chat
│   │   └── index.css       # Estilos globales
│   ├── package.json        # Dependencias Node.js
│   └── vite.config.js      # Configuración Vite
└── README.md               # Este archivo
```

## 🎨 Personalización

### Colores del Tema
Edita `SpeakCity_Frontend/src/index.css`:
```css
:root {
  --pastel-green: #a8e6cf;
  --pastel-pink: #f7cde2;
  --pastel-blue: #b3d9ff;
  --accent-primary: #3498db;
  --accent-secondary: #e74c3c;
}
```

### Tipografía
El sistema usa la fuente Inter. Para cambiar:
```css
font-family: 'Tu-Fuente', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Modo Demo
Si no tienes API key, el sistema funciona en modo demo con respuestas predefinidas.


## 👥 Hecho por:

- Daniela Camacho
- Edgar Mora
- Eduardo García
- Uriel Sánchez
