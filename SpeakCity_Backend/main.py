from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))

class ComandoTrafico(BaseModel):
    accion: str
    calle: str
    causa: str

@app.route('/')
def hello_world():
    return 'Hola jeje'

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        mensaje = data.get('message', '')

        if not mensaje:
            return jsonify({'error': 'No message provided'}), 400

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=f"Interpreta el siguiente comando del usuario y devuélvelo como JSON: {mensaje}",
            config={
                "response_mime_type": "application/json",
                "response_schema": ComandoTrafico
            }
        )

        # Resultado como objeto clase
        comando: ComandoTrafico = response.parsed

        return jsonify({
            "response": comando.dict(),
            "success": True
        })

    except Exception as e:
        return jsonify({
            "error": str(e),
            "success": False
        }), 500
    
if __name__ == '__main__':
    app.run(debug=True)
