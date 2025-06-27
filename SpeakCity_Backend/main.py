from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from pydantic import BaseModel, Field, validator
import os
import re
import logging
from dotenv import load_dotenv
from datetime import datetime
from typing import Optional, Dict, Any, List
import random
import threading
import time

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)

# Configuración de CORS
CORS(app)

# Verificar API key
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    logger.warning("GOOGLE_API_KEY no configurada. El sistema funcionará en modo demo.")
    DEMO_MODE = True
else:
    DEMO_MODE = False
    client = genai.Client(api_key=GOOGLE_API_KEY)

# Definición de acciones, causas y calles válidas (Diccionarios)
ACCIONES_VALIDAS = {
    'semaforo': ['cambiar_semaforo', 'activar_semaforo', 'desactivar_semaforo', 'programar_semaforo'],
    'flujo': ['abrir_carril', 'cerrar_carril', 'redirigir_trafico', 'controlar_flujo'],
    'incidente': ['reportar_incidente', 'limpiar_incidente', 'bloquear_via', 'desbloquear_via'],
    'velocidad': ['cambiar_limite', 'zona_escolar', 'reducir_velocidad', 'aumentar_velocidad'],
    'emergencia': ['activar_emergencia', 'desactivar_emergencia', 'via_emergencia']
}

CAUSAS_VALIDAS = [
    'congestion', 'accidente', 'construccion', 'evento_especial', 'clima_adverso',
    'mantenimiento', 'emergencia', 'hora_pico', 'bloqueo_temporal', 'optimizacion_flujo'
]

CALLES_VALIDAS = [f'V{i}' for i in range(1, 5)] + [f'H{i}' for i in range(1, 4)]

class ComandoTrafico(BaseModel):
    accion: str = Field(..., description="Acción específica a realizar en el sistema de tráfico")
    calle: str = Field(..., description="Nombre de la calle o intersección donde aplicar la acción")
    causa: str = Field(..., description="Motivo o causa que justifica la acción")
    prioridad: Optional[str] = Field(default="media", description="Prioridad del comando: baja, media, alta, critica")
    duracion_estimada: Optional[int] = Field(default=None, description="Duración estimada en minutos")

    @validator('accion')
    def validar_accion(cls, v):
        v = v.lower().strip()
        acciones_permitidas = [accion for categoria in ACCIONES_VALIDAS.values() for accion in categoria]
        if v not in acciones_permitidas:
            raise ValueError(f"Acción '{v}' no permitida. Acciones válidas: {acciones_permitidas}")
        return v

    @validator('calle')
    def validar_calle(cls, v):
        v = v.strip().upper()
        if v not in CALLES_VALIDAS:
            raise ValueError(f"Calle '{v}' no válida. Usa calles como V1–V4 o H1–H3.")
        return v

    @validator('causa')
    def validar_causa(cls, v):
        v = v.lower().strip()
        if v not in CAUSAS_VALIDAS:
            raise ValueError(f"Causa '{v}' no válida. Causas permitidas: {CAUSAS_VALIDAS}")
        return v

    @validator('prioridad')
    def validar_prioridad(cls, v):
        if v is not None:
            v = v.lower().strip()
            if v not in ['baja', 'media', 'alta', 'critica']:
                raise ValueError("Prioridad debe ser: baja, media, alta o critica")
        return v

def es_comando_trafico_valido(mensaje: str) -> bool:
    """Validamos si el mensaje está relacionado con tráfico"""
    palabras_trafico = [
        'semaforo', 'trafico', 'calle', 'avenida', 'carril', 'congestion',
        'accidente', 'velocidad', 'flujo', 'interseccion', 'via', 'ruta',
        'bloqueo', 'emergencia', 'construccion', 'mantenimiento', 'abrir', 
        'desbloquear', 'liberar', 'V1', 'V2', 'V3', 'V4', 'H1', 'H2', 'H3', 'choque', 
    ]
    
    mensaje_lower = mensaje.lower()
    return any(palabra in mensaje_lower for palabra in palabras_trafico)

def sanitizar_entrada(mensaje: str) -> str:
    """Sanitiza la entrada del usuario"""
    # Remover caracteres potencialmente peligrosos
    mensaje = re.sub(r'[<>"\';{}()=]', '', mensaje)
    mensaje = mensaje[:500]
    mensaje = ' '.join(mensaje.split())
    return mensaje

def generar_prompt_contextual(mensaje: str) -> str:
    """Genera un prompt contextual específico para control de tráfico"""
    return f"""
Eres un asistente especializado en control de tráfico urbano. Tu función es interpretar comandos de usuarios para un sistema de gemelo digital de tráfico.

CONTEXTO ESPECÍFICO:
- Solo puedes procesar comandos relacionados con tráfico urbano
- Debes extraer información específica para controlar semáforos, flujo vehicular, y gestión de incidentes
- Responde ÚNICAMENTE con comandos válidos del sistema de tráfico

COMANDOS VÁLIDOS:
1. SEMÁFOROS: cambiar_semaforo, activar_semaforo, desactivar_semaforo, programar_semaforo
2. FLUJO: abrir_carril, cerrar_carril, redirigir_trafico, controlar_flujo  
3. INCIDENTES: reportar_incidente, limpiar_incidente, bloquear_via, desbloquear_via
4. VELOCIDAD: cambiar_limite, zona_escolar, reducir_velocidad, aumentar_velocidad
5. EMERGENCIA: activar_emergencia, desactivar_emergencia, via_emergencia

CAUSAS VÁLIDAS:
congestion, accidente, construccion, evento_especial, clima_adverso, mantenimiento, emergencia, hora_pico, bloqueo_temporal, optimizacion_flujo

CALLLES PERMITIDAS: V1–V3 (verticales), H1–H2 (horizontales)

INSTRUCCIONES:
- Si el comando NO está relacionado con tráfico, responde con accion: "comando_invalido"
- Identifica la acción más específica posible
- Extrae el nombre exacto de la calle/intersección
- Determina la causa más apropiada
- Asigna prioridad según urgencia (baja, media, alta, critica)
- Estima duración si es aplicable

ENTRADA DEL USUARIO: "{mensaje}"

Interpreta este comando y devuelve un JSON válido con la estructura solicitada.
"""

def generar_respuesta_demo(mensaje: str) -> Dict[str, Any]:
    """Genera una respuesta de demo cuando no hay API key configurada"""
    mensaje_lower = mensaje.lower()
    
    # Lógica simple para demo
    if 'semaforo' in mensaje_lower:
        accion = 'cambiar_semaforo'
        calle = 'V1'
        causa = 'congestion'
    elif 'carril' in mensaje_lower:
        accion = 'cerrar_carril'
        calle = 'H2'
        causa = 'mantenimiento'
    elif 'accidente' in mensaje_lower:
        accion = 'reportar_incidente'
        calle = 'V3'
        causa = 'accidente'
    else:
        accion = 'controlar_flujo'
        calle = 'V1'
        causa = 'congestion'
    
    return {
        'accion': accion,
        'calle': calle,
        'causa': causa,
        'prioridad': 'media',
        'duracion_estimada': 30
    }

# Estado global del mapa
class EstadoMapa:
    def __init__(self):
        self.calles_cerradas = set()  # Set de calles cerradas
        self.semaforos_estado = {}    # Estado de semáforos
        self.vehiculos = []           # Lista de vehículos
        self.incidentes = {}          # Incidentes activos
        self.lock = threading.Lock()  # Para thread safety
        
        # Inicializar semáforos
        for calle in CALLES_VALIDAS:
            self.semaforos_estado[calle] = {
                'estado': 'verde',
                'tiempo_restante': 30,
                'ultimo_cambio': time.time()
            }
        
        # Inicializar vehículos
        self.inicializar_vehiculos()
    
    def inicializar_vehiculos(self):
        """Inicializa vehículos en el mapa"""
        self.vehiculos = []
        
        # Vehículos en calles verticales
        for i, calle in enumerate(['V1', 'V2', 'V3']):
            for j in range(1):  # 3 vehículos por calle
                self.vehiculos.append({
                    'id': f'v_{calle}_{j}',
                    'tipo': 'auto',
                    'calle': calle,
                    'posicion': random.uniform(0, 0),  # Posición Y
                    'velocidad': random.uniform(0.5, 2.0),
                    'direccion': 'sur',  # Verticales van de norte a sur
                    'color': self.get_color_vehiculo(),
                    'activo': True
                })
        
        # Vehículos en calles horizontales
        for i, calle in enumerate(['H1', 'H2']):
            for j in range(1):  # 2 vehículos por calle horizontal
                self.vehiculos.append({
                    'id': f'h_{calle}_{j}',
                    'tipo': 'auto',
                    'calle': calle,
                    'posicion': random.uniform(0, 0),  # Posición X
                    'velocidad': random.uniform(0.5, 2.0),
                    'direccion': 'este',  # Horizontales van de oeste a este
                    'color': self.get_color_vehiculo(),
                    'movimiento': True,
                    'activo': True
                })
    
    def get_color_vehiculo(self):
        """Retorna un color aleatorio para el vehículo"""
        colores = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
        return random.choice(colores)
    
    def cerrar_calle(self, calle: str):
        """Cierra una calle"""
        with self.lock:
            self.calles_cerradas.add(calle)
            # Detener vehículos en esa calle
            for vehiculo in self.vehiculos:
                if vehiculo['calle'] == calle:
                    vehiculo['activo'] = False
    
    def abrir_calle(self, calle: str):
        """Abre una calle"""
        with self.lock:
            self.calles_cerradas.discard(calle)
            # Reactivar vehículos en esa calle
            for vehiculo in self.vehiculos:
                if vehiculo['calle'] == calle:
                    vehiculo['activo'] = True
    
    def cambiar_semaforo(self, calle: str, estado: str):
        """Cambia el estado de un semáforo"""
        with self.lock:
            if calle in self.semaforos_estado:
                self.semaforos_estado[calle]['estado'] = estado
                self.semaforos_estado[calle]['ultimo_cambio'] = time.time()
    
    def actualizar_vehiculos(self):
        """Actualiza las posiciones de los vehículos"""
        # Definir posiciones de intersección para cada calle
        intersecciones = {
            # H1 cruza V1, V2, V3
            'H1': {'V1': 120, 'V2': 245, 'V3': 370},
            # H2 cruza V1, V2, V3
            'H2': {'V1': 120, 'V2': 245, 'V3': 370},
            # V1 cruza H1, H2
            'V1': {'H1': 128, 'H2': 261},
            'V2': {'H1': 128, 'H2': 261},
            'V3': {'H1': 128, 'H2': 261},
        }
        
        with self.lock:
            for vehiculo in self.vehiculos:
                if not vehiculo['activo']:
                    continue
                
                #Revisa si las intersecciones con las calles están cerradas
                for calle_cerrada in self.calles_cerradas:
                    if calle_cerrada in intersecciones[vehiculo['calle']]: # Si la calle cerrada está en las intersecciones de la calle del vehículo
                        pos_inter = intersecciones[vehiculo['calle']][calle_cerrada] # Obtiene posición de intersección
                        if vehiculo['movimiento']:
                            # Si está antes o después de la intersección con calle cerrada, avanza
                            if vehiculo['posicion'] + vehiculo['velocidad'] < pos_inter -5 or vehiculo['posicion'] + vehiculo['velocidad'] > pos_inter + 5:
                                vehiculo['posicion'] += vehiculo['velocidad']
                            else:
                                vehiculo['posicion'] = pos_inter - 5  # Se detiene justo antes
                                vehiculo['movimiento'] = False # Desactiva bandera de movimiento
                else: # Si no hay intersección cerrada, avanza normal
                    vehiculo['movimiento'] = True #Activa bandera de movimiento
                    vehiculo['posicion'] += vehiculo['velocidad']
                    # Reinicio de movimiento del coche
                    if vehiculo['direccion'] == 'este' and vehiculo['posicion'] > 500:
                            vehiculo['posicion'] = 0
                    elif vehiculo['direccion'] == 'sur' and vehiculo['posicion'] > 400:
                            vehiculo['posicion'] = 0
    
    def get_estado(self):
        """Retorna el estado completo del mapa"""
        with self.lock:
            return {
                'calles_cerradas': list(self.calles_cerradas),
                'semaforos': self.semaforos_estado,
                'vehiculos': self.vehiculos,
                'incidentes': self.incidentes
            }

# Instancia global del estado del mapa
estado_mapa = EstadoMapa()

# Thread para actualizar vehículos
def actualizar_vehiculos_thread():
    """Thread que actualiza las posiciones de los vehículos"""
    while True:
        estado_mapa.actualizar_vehiculos()
        time.sleep(0.1)  # Actualizar cada 100ms

# Iniciar thread de actualización
thread_actualizacion = threading.Thread(target=actualizar_vehiculos_thread, daemon=True)
thread_actualizacion.start()

@app.route('/')
def hello_world():
    return jsonify({
        'status': 'Sistema de Control de Trafico Activo: SpeakCity',
        'version': '1.0',
        'timestamp': datetime.now().isoformat(),
        'demo_mode': DEMO_MODE,
        'api_status': 'Configurada' if not DEMO_MODE else 'Demo Mode'
    })

@app.route('/api/status')
def status():
    """Endpoint para verificar el estado del sistema"""
    return jsonify({
        'status': 'online',
        'timestamp': datetime.now().isoformat(),
        'demo_mode': DEMO_MODE,
        'api_configured': not DEMO_MODE
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        mensaje = data.get('message', '')

        # Log de la petición
        logger.info(f"Nueva petición recibida: {mensaje[:50]}...")

        # Validaciones de entrada
        if not mensaje:
            return jsonify({
                'error': 'No se proporcionó mensaje',
                'success': False
            }), 400

        if len(mensaje) > 500:
            return jsonify({
                'error': 'Mensaje demasiado largo (máximo 500 caracteres)',
                'success': False
            }), 400
        
        mensaje_sanitizado = sanitizar_entrada(mensaje)

        if not es_comando_trafico_valido(mensaje_sanitizado):
            return jsonify({
                'error': 'Comando fuera del contexto de tráfico',
                'success': False,
                'suggestion': 'Solo acepto comandos relacionados con control de tráfico urbano'
            }), 400
        
        # Modo demo o API real
        if DEMO_MODE:
            logger.info("Ejecutando en modo demo")
            comando_dict = generar_respuesta_demo(mensaje_sanitizado)
            comando = ComandoTrafico(**comando_dict)
        else:
            prompt = generar_prompt_contextual(mensaje_sanitizado)

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": ComandoTrafico,
                    "temperature": 0.1,
                    "max_output_tokens": 200
                }
            )

            # Resultado como objeto clase
            comando: ComandoTrafico = response.parsed

        # Validación final: comando inválido
        if comando.dict().get('accion') == 'comando_invalido':
            return jsonify({
                'error': 'Comando no relacionado con tráfico',
                'success': False,
                'suggestion': 'Intenta con comandos como: "cambiar semáforo en Av. Principal" o "cerrar carril por accidente"'
            }), 400

        # Aplicar cambios al mapa según el comando
        aplicar_cambios_mapa(comando)

        logger.info(f"Comando procesado exitosamente: {comando.dict()}")

        return jsonify({
            "response": comando.dict(),
            "success": True,
            "demo_mode": DEMO_MODE
        })

    except Exception as e:
        logger.error(f"Error en el procesamiento: {str(e)}")
        return jsonify({
            "error": str(e),
            "success": False,
            "demo_mode": DEMO_MODE
        }), 500

def aplicar_cambios_mapa(comando: ComandoTrafico):
    """Aplica los cambios al mapa según el comando recibido"""
    accion = comando.accion
    calle = comando.calle
    
    logger.info(f"Aplicando cambio: {accion} en {calle}")
    
    if accion in ['cerrar_carril', 'bloquear_via']:
        estado_mapa.cerrar_calle(calle)
    elif accion in ['abrir_carril', 'desbloquear_via']:
        estado_mapa.abrir_calle(calle)
    elif accion in ['cambiar_semaforo', 'activar_semaforo']:
        # Cambiar a rojo si hay congestión o accidente
        nuevo_estado = 'rojo' if comando.causa in ['congestion', 'accidente'] else 'verde'
        estado_mapa.cambiar_semaforo(calle, nuevo_estado)
    elif accion == 'desactivar_semaforo':
        estado_mapa.cambiar_semaforo(calle, 'amarillo')
    elif accion == 'reportar_incidente':
        estado_mapa.cerrar_calle(calle)
        estado_mapa.incidentes[calle] = {
            'tipo': comando.causa,
            'tiempo': time.time(),
            'duracion': comando.duracion_estimada or 30
        }

@app.route('/api/mapa/estado')
def obtener_estado_mapa():
    """Endpoint para obtener el estado actual del mapa"""
    try:
        estado = estado_mapa.get_estado()
        return jsonify({
            'success': True,
            'estado': estado,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error obteniendo estado del mapa: {str(e)}")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/api/mapa/cerrar-calle', methods=['POST'])
def cerrar_calle_endpoint():
    """Endpoint para cerrar una calle específica"""
    try:
        data = request.get_json()
        calle = data.get('calle')
        
        if not calle or calle not in CALLES_VALIDAS:
            return jsonify({
                'error': 'Calle no válida',
                'success': False
            }), 400
        
        estado_mapa.cerrar_calle(calle)
        
        return jsonify({
            'success': True,
            'mensaje': f'Calle {calle} cerrada exitosamente'
        })
    except Exception as e:
        logger.error(f"Error cerrando calle: {str(e)}")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/api/mapa/abrir-calle', methods=['POST'])
def abrir_calle_endpoint():
    """Endpoint para abrir una calle específica"""
    try:
        data = request.get_json()
        calle = data.get('calle')
        
        if not calle or calle not in CALLES_VALIDAS:
            return jsonify({
                'error': 'Calle no válida',
                'success': False
            }), 400
        
        estado_mapa.abrir_calle(calle)
        
        return jsonify({
            'success': True,
            'mensaje': f'Calle {calle} abierta exitosamente'
        })
    except Exception as e:
        logger.error(f"Error abriendo calle: {str(e)}")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/api/mapa/semaforo', methods=['POST'])
def cambiar_semaforo_endpoint():
    """Endpoint para cambiar el estado de un semáforo"""
    try:
        data = request.get_json()
        calle = data.get('calle')
        estado = data.get('estado', 'verde')
        
        if not calle or calle not in CALLES_VALIDAS:
            return jsonify({
                'error': 'Calle no válida',
                'success': False
            }), 400
        
        if estado not in ['verde', 'amarillo', 'rojo']:
            return jsonify({
                'error': 'Estado de semáforo no válido',
                'success': False
            }), 400
        
        estado_mapa.cambiar_semaforo(calle, estado)
        
        return jsonify({
            'success': True,
            'mensaje': f'Semáforo en {calle} cambiado a {estado}'
        })
    except Exception as e:
        logger.error(f"Error cambiando semáforo: {str(e)}")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/api/mapa/reset', methods=['POST'])
def reset_mapa():
    """Endpoint para resetear el estado del mapa"""
    try:
        # Reinicializar el estado del mapa
        global estado_mapa
        estado_mapa = EstadoMapa()
        
        return jsonify({
            'success': True,
            'mensaje': 'Mapa reseteado exitosamente'
        })
    except Exception as e:
        logger.error(f"Error reseteando mapa: {str(e)}")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    logger.info(f"Iniciando servidor en puerto {port}")
    logger.info(f"Modo debug: {debug}")
    logger.info(f"Modo demo: {DEMO_MODE}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
