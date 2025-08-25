from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from pydantic import BaseModel, Field, validator
import os
import re
import logging
import json
from dotenv import load_dotenv
from datetime import datetime
from typing import Optional, Dict, Any, List

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
    'semaforo': ['cambiar_semaforo_rojo', 'cambiar_semaforo_verde', 'activar_semaforo', 'desactivar_semaforo', 
                    'programar_semaforo'],
    'flujo': ['abrir_calle', 'cerrar_calle', 'redirigir_trafico', 'controlar_flujo', 'abrir_todas_calles'],
    'incidente': ['reportar_incidente', 'limpiar_incidente', 'bloquear_via', 'desbloquear_via'],
    'velocidad': ['cambiar_limite', 'zona_escolar', 'reducir_velocidad', 'aumentar_velocidad'],
    'emergencia': ['activar_emergencia', 'desactivar_emergencia', 'via_emergencia'],
    'densidad': ['trafico_alto', 'trafico_medio', 'trafico_bajo']
}

CAUSAS_VALIDAS = [
    'congestion', 'accidente', 'construccion', 'evento_especial', 'clima_adverso',
    'mantenimiento', 'emergencia', 'hora_pico', 'bloqueo_temporal', 'optimizacion_flujo'
]

CALLES_VALIDAS = [
                    'H00', 'H01', 'H02', 'H03',
                    'H10', 'H13', 
                    'H20', 'H21', 'H22', 'H23',
                    'H32', 'H33',
                    'V00', 'V01', 'V02', 'V03',
                    'V10', 'V11', 'V12', 'V13',
                    'V20', 'V23',
                    'V30', 'V31', 'V33', 
                    'V40', 'V41', 'V42', 'V43', 
                    'H40', 'H41', 'H42', 'H43'
                ]

SEMAFOROS_VALIDOS = ['I00', 'I01', 'I02', 'I03', 'I04', 
                    'I10', 'I11', 'I12', 'I13', 'I14',
                    'I20', 'I21', 'I22', 'I23', 'I24',
                    'I30', 'I31', 'I32', 'I33', 'I34',
                    'I40', 'I41', 'I42', 'I43', 'I44']

INTERSECCIONES = SEMAFOROS_VALIDOS

SEMAFOROS_VALIDOS_COPY = []
for item in SEMAFOROS_VALIDOS:
    SEMAFOROS_VALIDOS_COPY.append(item + ' top')
    SEMAFOROS_VALIDOS_COPY.append(item + ' right')
    SEMAFOROS_VALIDOS_COPY.append(item + ' bottom')
    SEMAFOROS_VALIDOS_COPY.append(item + ' left')
SEMAFOROS_VALIDOS = SEMAFOROS_VALIDOS_COPY


class ComandoTrafico(BaseModel):
    accion: str = Field(..., description="Acción específica a realizar en el sistema de tráfico")
    calle: str = Field(..., description="Nombre de la calle o intersección donde aplicar la acción")
    causa: str = Field(..., description="Motivo o causa que justifica la acción")
    prioridad: Optional[str] = Field(default="media", description="Prioridad del comando: baja, media, alta, critica")
    duracion_estimada: Optional[int] = Field(default=None, description="Duración estimada en minutos")
    duracion_estimada_segundos: Optional[int] = Field(default=None, description="Duración estimada del intervalo de cambio del semaforo en segundos")
    densidad_vehicular: Optional[int] = Field(default=0, description="Densidad del trafico: bajo, medio, alto")
    orden_ejecucion: Optional[int] = Field(default=1, description="Orden de ejecución del comando")

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
        # Para la acción 'abrir_todas_calles', permitir 'TODAS' como valor especial
        if v == 'TODAS':
            return v
        if not (v in CALLES_VALIDAS or v in [s.upper() for s in SEMAFOROS_VALIDOS]):
            raise ValueError(f"Calle '{v}' no válida. Usa calles como V1—V4 o H1—H3.")
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


# Nueva clase para manejar múltiples comandos
class RespuestaMultipleComandos(BaseModel):
    comandos: List[ComandoTrafico] = Field(..., description="Lista de comandos de tráfico a ejecutar")
    resumen_general: Optional[str] = Field(default="", description="Resumen de las acciones solicitadas")
    total_comandos: Optional[int] = Field(default=0, description="Número total de comandos identificados")

def es_comando_trafico_valido(mensaje: str) -> bool:
    """Validamos si el mensaje está relacionado con tráfico"""
    palabras_trafico = [
        'semaforo', 'tráfico', 'calle', 'avenida', 'carril', 'congestion',
        'accidente', 'velocidad', 'flujo', 'interseccion', 'via', 'ruta',
        'bloqueo', 'emergencia', 'construccion', 'mantenimiento', 'abrir', 
        'desbloquear', 'liberar', 'V1', 'V2', 'V3', 'V4', 'H1', 'H2', 'H3', 'choque',
        'todas', 'todas las calles', 'reabrir', 'normalizar', 'restablecer','abre', 'reabre',
        'reabrir todas', 'abrir todas', 'normalizar tráfico', 'restablecer todas', 'la calle', 'cierra', 'Cierra',
        'alto', 'medio', 'bajo'
    ]
    
    mensaje_lower = mensaje.lower()
    return any(palabra in mensaje_lower for palabra in palabras_trafico)

def sanitizar_entrada(mensaje: str) -> str:
    """Sanitiza la entrada del usuario"""
    # Remover caracteres potencialmente peligrosos
    mensaje = re.sub(r'[<>"\';{}()=]', '', mensaje)
    mensaje = mensaje[:1000]  # Aumentado para comandos múltiples
    mensaje = ' '.join(mensaje.split())
    return mensaje

def generar_prompt_multicomando(mensaje: str) -> str:
    """Genera un prompt para procesar múltiples comandos de tráfico"""
    return f"""
Eres un asistente especializado en control de tráfico urbano. Debes interpretar comandos complejos que pueden contener MÚLTIPLES acciones simultáneas.

IMPORTANTE:
- Identifica TODOS los comandos de tráfico en el mensaje
- Ordena los comandos por prioridad lógica de ejecución
- Cada comando debe ser independiente y específico

COMANDOS VÁLIDOS:
1. SEMÁFOROS: {ACCIONES_VALIDAS['semaforo']}
2. FLUJO: abrir_calle, cerrar_calle, redirigir_trafico, controlar_flujo, abrir_todas_calles
3. INCIDENTES: reportar_incidente, limpiar_incidente, bloquear_via, desbloquear_via
4. VELOCIDAD: cambiar_limite, zona_escolar, reducir_velocidad, aumentar_velocidad
5. EMERGENCIA: activar_emergencia, desactivar_emergencia, via_emergencia
6. TRAFICO: trafico_alto, trafico_medio, trafico_bajo

CAUSAS VÁLIDAS: {CAUSAS_VALIDAS}
CALLES PERMITIDAS: {CALLES_VALIDAS}
SEMAFOROS VALIDOS: {SEMAFOROS_VALIDOS}

COMANDO ESPECIAL:
- Para abrir TODAS las calles cerradas, usa: accion='abrir_todas_calles', calle='TODAS'
- Este comando detecta frases como: "abrir todas las calles", "reabrir todas las vías", "normalizar tráfico", "restablecer todas las calles"
- Si el usuario pide activar los semaforos de una de estas intersecciones {INTERSECCIONES} entonces se regresan 4 acciones a ejecutar que es activar el semaforo de arriba, abajo, izquierda y derecha de la interseccion que corresponda 
- De acuerdo al trafico devuelve densidad_vehicular como un valor numerico en los casos "alto"=2, "medio"=1, "bajo"=0

REGLAS DE ORDENAMIENTO:
1. Emergencias primero (orden_ejecucion: 1)
2. Reportar incidentes (orden_ejecucion: 2)
3. Bloqueos/cierres (orden_ejecucion: 3)
4. Cambios de semáforos (orden_ejecucion: 4)
5. Redirecciones de tráfico (orden_ejecucion: 5)
6. Abrir todas las calles (orden_ejecucion: 6)

ENTRADA: "{mensaje}"

Analiza este mensaje y extrae TODOS los comandos de tráfico identificados. Devuelve un JSON con la estructura solicitada, incluyendo un resumen general de las acciones.
"""

def generar_respuesta_demo_multiple(mensaje: str) -> Dict[str, Any]:
    """Genera respuestas de demo para múltiples comandos"""
    mensaje_lower = mensaje.lower()
    comandos = []
    orden = 1
    
    # Detectar comando para abrir todas las calles
    if any(frase in mensaje_lower for frase in ['abrir todas', 'todas las calles', 'reabrir todas', 'normalizar trafico', 'restablecer']):
        comandos.append({
            'accion': 'abrir_todas_calles',
            'calle': 'TODAS',
            'causa': 'optimizacion_flujo',
            'prioridad': 'alta',
            'duracion_estimada': 5,
            'orden_ejecucion': orden
        })
        orden += 1
    
    # Detectar múltiples acciones en el mensaje
    if 'accidente' in mensaje_lower or 'choque' in mensaje_lower:
        comandos.append({
            'accion': 'reportar_incidente',
            'calle': 'V11',
            'causa': 'accidente',
            'prioridad': 'alta',
            'duracion_estimada': 60,
            'orden_ejecucion': orden
        })
        orden += 1
    
    if 'cerrar' in mensaje_lower and 'calle' in mensaje_lower:
        comandos.append({
            'accion': 'cerrar_calle',
            'calle': 'V11',
            'causa': 'accidente',
            'prioridad': 'alta',
            'duracion_estimada': 45,
            'orden_ejecucion': orden
        })
        orden += 1
    
    if 'semaforo' in mensaje_lower:
        comandos.append({
            'accion': 'cambiar_semaforo',
            'calle': 'H12',
            'causa': 'congestion',
            'prioridad': 'media',
            'duracion_estimada': 15,
            'orden_ejecucion': orden
        })
        orden += 1
    
    if 'redirigir' in mensaje_lower or 'desviar' in mensaje_lower:
        comandos.append({
            'accion': 'redirigir_trafico',
            'calle': 'V12',
            'causa': 'optimizacion_flujo',
            'prioridad': 'media',
            'duracion_estimada': 30,
            'orden_ejecucion': orden
        })
    
    # Si no se detectan comandos específicos, crear uno genérico
    if not comandos:
        comandos.append({
            'accion': 'controlar_flujo',
            'calle': 'V10',
            'causa': 'congestion',
            'prioridad': 'media',
            'duracion_estimada': 20,
            'orden_ejecucion': 1
        })
    
    return {
        'comandos': comandos,
        'resumen_general': f"Se identificaron {len(comandos)} comandos de tráfico para ejecutar en secuencia",
        'total_comandos': len(comandos)
    }

def validar_y_ordenar_comandos(comandos: List[ComandoTrafico]) -> List[ComandoTrafico]:
    """Valida y ordena los comandos por prioridad y orden de ejecución"""
    # Filtrar comandos inválidos
    comandos_validos = [cmd for cmd in comandos if cmd.accion != 'comando_invalido']
    
    # Ordenar por prioridad y orden de ejecución 
    prioridades = {'critica': 1, 'alta': 2, 'media': 3, 'baja': 4}
    
    comandos_ordenados = sorted(comandos_validos, key=lambda x: (
        prioridades.get(x.prioridad, 3),  # Prioridad
        x.orden_ejecucion or 999  # Orden de ejecución
    ))
    
    # Reasignar orden secuencial
    for i, cmd in enumerate(comandos_ordenados, 1):
        cmd.orden_ejecucion = i
    
    return comandos_ordenados

@app.route('/')
def hello_world():
    return jsonify({
        'status': 'Sistema de Control de Trafico Activo: SpeakCity',
        'version': '2.0 - Múltiples Comandos',
        'timestamp': datetime.now().isoformat(),
        'demo_mode': DEMO_MODE,
        'api_status': 'Configurada' if not DEMO_MODE else 'Demo Mode',
        'features': ['single_command', 'multiple_commands', 'priority_ordering', 'open_all_streets']
    })


@app.route('/api/status')
def status():
    """Endpoint para verificar el estado del sistema"""
    return jsonify({
        'status': 'online',
        'timestamp': datetime.now().isoformat(),
        'demo_mode': DEMO_MODE,
        'api_configured': not DEMO_MODE,
        'max_commands_per_request': 10
    })


@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        mensaje = data.get('message', '')

        # Log de la petición
        logger.info(f"Nueva petición recibida: {mensaje[:100]}...")

        # Validaciones de entrada
        if not mensaje:
            return jsonify({
                'error': 'No se proporcionó mensaje',
                'success': False
            }), 400

        if len(mensaje) > 1000:  # Aumentado para comandos múltiples
            return jsonify({
                'error': 'Mensaje demasiado largo (máximo 1000 caracteres)',
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
            logger.info("Ejecutando en modo demo - múltiples comandos")
            respuesta_dict = generar_respuesta_demo_multiple(mensaje_sanitizado)
            respuesta = RespuestaMultipleComandos(**respuesta_dict)
        else:
            prompt = generar_prompt_multicomando(mensaje_sanitizado)
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": RespuestaMultipleComandos,
                    "temperature": 0.1,
                    "max_output_tokens": 800  # Aumentado para múltiples comandos
                }
            )
            print('eeee')
            print(f'Response Antes de parsed: {response}')
            print(f'Response parsed: {response.parsed}')
            respuesta: RespuestaMultipleComandos = response.parsed
            if respuesta is None:
                content_json = response.candidates[0].content.parts[0].text
                data = json.loads(content_json)
                respuesta = RespuestaMultipleComandos(**data)
            print(f'Final Respuesta: {respuesta}')
            
        # Validar y ordenar comandos
        comandos_procesados = validar_y_ordenar_comandos(respuesta.comandos)

        if not comandos_procesados:
            return jsonify({
                'error': 'No se identificaron comandos válidos de tráfico',
                'success': False,
                'suggestion': 'Intenta con comandos específicos como: "Cierra calle V11 por accidente y cambia semáforo en H12"'
            }), 400

        # Actualizar la respuesta con comandos procesados
        respuesta.comandos = comandos_procesados
        respuesta.total_comandos = len(comandos_procesados)

        logger.info(f"Procesados {len(comandos_procesados)} comandos exitosamente")

        return jsonify({
            "response": {
                "comandos": [cmd.dict() for cmd in respuesta.comandos],
                "resumen_general": respuesta.resumen_general,
                "total_comandos": respuesta.total_comandos,
                "orden_ejecucion": [f"{cmd.orden_ejecucion}. {cmd.accion} en {cmd.calle}" for cmd in respuesta.comandos]
            },
            "success": True,
            "demo_mode": DEMO_MODE,
            "multiple_commands": True
        })

    except Exception as e:
        logger.error(f"Error en el procesamiento: {str(e)}")
        return jsonify({
            "error": str(e),
            "success": False,
            "demo_mode": DEMO_MODE
        }), 500

# Endpoint adicional para comandos individuales (retrocompatibilidad)
@app.route('/api/chat/single', methods=['POST'])
def chat_single():
    """Endpoint para mantener compatibilidad con comandos individuales"""
    try:
        data = request.get_json()
        mensaje = data.get('message', '')

        # Reutilizar la lógica original para un solo comando
        mensaje_sanitizado = sanitizar_entrada(mensaje)

        if not es_comando_trafico_valido(mensaje_sanitizado):
            return jsonify({
                'error': 'Comando fuera del contexto de tráfico',
                'success': False
            }), 400

        if DEMO_MODE:
            comando_dict = {
                'accion': 'controlar_flujo',
                'calle': 'V10',
                'causa': 'congestion',
                'prioridad': 'media',
                'duracion_estimada': 20
            }
            comando = ComandoTrafico(**comando_dict)
        else:
            # Usar el prompt original para un solo comando
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
            comando: ComandoTrafico = response.parsed

        if comando.dict().get('accion') == 'comando_invalido':
            return jsonify({
                'error': 'Comando no relacionado con tráfico',
                'success': False
            }), 400

        return jsonify({
            "response": comando.dict(),
            "success": True,
            "demo_mode": DEMO_MODE,
            "single_command": True
        })

    except Exception as e:
        logger.error(f"Error en comando individual: {str(e)}")
        return jsonify({
            "error": str(e),
            "success": False
        }), 500


"""Acá dejo el prompt original para comandos individuales, por si se necesita"""
def generar_prompt_contextual(mensaje: str) -> str:
    """Prompt original para comandos individuales"""
    return f"""
Eres un asistente especializado en control de tráfico urbano. Tu función es interpretar comandos de usuarios para un sistema de gemelo digital de tráfico.

CONTEXTO ESPECÍFICO:
- Solo puedes procesar comandos relacionados con tráfico urbano
- Debes extraer información específica para controlar semáforos, flujo vehicular, y gestión de incidentes
- Responde ÚNICAMENTE con comandos válidos del sistema de tráfico

COMANDOS VÁLIDOS:
1. SEMÁFOROS: cambiar_semaforo, activar_semaforo, desactivar_semaforo, programar_semaforo
2. FLUJO: abrir_calle, cerrar_calle, redirigir_trafico, controlar_flujo, abrir_todas_calles
3. VELOCIDAD: cambiar_limite, zona_escolar, reducir_velocidad, aumentar_velocidad
4. EMERGENCIA: activar_emergencia, desactivar_emergencia, via_emergencia

CAUSAS VÁLIDAS:
congestion, accidente, construccion, evento_especial, clima_adverso, mantenimiento, emergencia, hora_pico, bloqueo_temporal, optimizacion_flujo

CALLLES PERMITIDAS: {CALLES_VALIDAS}

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

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    logger.info(f"Iniciando servidor en puerto {port}")
    logger.info(f"Modo debug: {debug}")
    logger.info(f"Modo demo: {DEMO_MODE}")
    logger.info("Funcionalidad de múltiples comandos activada")
    
    app.run(host='0.0.0.0', port=port, debug=debug)