#!/usr/bin/env python3
"""
Backend em Python para o Hotel Paraíso
Execute: python3 server.py
"""

from flask import Flask, send_file
import os

app = Flask(__name__)

# Rota principal
@app.route('/')
def index():
    return send_file('index.html')

# Rotas para arquivos estáticos
@app.route('/style.css')
def serve_css():
    return send_file('style.css')

@app.route('/script.js')
def serve_js():
    return send_file('script.js')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'true').lower() == 'true'
    
    print("🏨 Hotel Paraíso")
    print(f"🌐 Servidor iniciado em http://localhost:{port}")
    print("\nPressione Ctrl+C para parar o servidor\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
