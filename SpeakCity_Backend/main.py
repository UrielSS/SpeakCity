from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from pydantic import BaseModel, Field, validator
import os
import re
import logging
from dotenv import load_dotenv
from datetime import datetime
from typing import Optional, Dict, Any

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)

# Configuración de CORS más específica
CORS(app, origins=[
    "http://localhost:5173",
    "http://localhost:5174", 
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174"
])

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
        'bloqueo', 'emergencia', 'construccion', 'mantenimiento'
    ]
    
    mensaje_lower = mensaje.lower()
    return any(palabra in mensaje_lower for palabra in palabras_trafico)

def sanitizar_entrada(mensaje: str) -> str:
    """Sanitiza la entrada del usuario"""
    # Remover caracteres potencialmente peligrosos
    mensaje = re.sub(r'[<>"\';{}()=]', '', mensaje)
    # Limitar longitud
    mensaje = mensaje[:500]
    # Remover espacios extra
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

CALLLES PERMITIDAS: V1–V4 (verticales), H1–H3 (horizontales)

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

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    logger.info(f"Iniciando servidor en puerto {port}")
    logger.info(f"Modo debug: {debug}")
    logger.info(f"Modo demo: {DEMO_MODE}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
