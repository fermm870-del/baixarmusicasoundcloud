#!/usr/bin/env python3
"""
Backend em Python para o SoundCloud Downloader
Execute: python3 server.py
"""

from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import os
import sys
import json
import threading
import time
import uuid
from pathlib import Path

# Importar yt-dlp
try:
    import yt_dlp
except ImportError:
    print("ERRO: yt-dlp não está instalado. Execute: pip install yt-dlp")
    sys.exit(1)

app = Flask(__name__)
CORS(app)  # Permitir requisições do frontend

# Configurações
DOWNLOAD_DIR = Path("downloads")
MAX_CONCURRENT_DOWNLOADS = 3

# Garantir que o diretório existe
DOWNLOAD_DIR.mkdir(exist_ok=True)

# Dicionário para rastrear downloads ativos
active_downloads = {}

class DownloadManager:
    @staticmethod
    def start_download(url, mode="single", format="mp3", quality="192"):
        """Inicia um download em segundo plano usando a API Python do yt-dlp"""
        
        download_id = str(uuid.uuid4())[:8]
        download_path = DOWNLOAD_DIR / download_id
        download_path.mkdir(exist_ok=True)
        
        # Registrar download ativo
        active_downloads[download_id] = {
            "id": download_id,
            "url": url,
            "mode": mode,
            "format": format,
            "quality": quality,
            "status": "starting",
            "progress": 0,
            "current_track": "",
            "path": str(download_path),
            "start_time": time.time(),
            "files": [],
            "error": None
        }
        
        # Iniciar em thread separada
        thread = threading.Thread(
            target=DownloadManager._download_thread,
            args=(download_id, url, mode, format, quality, download_path)
        )
        thread.daemon = True
        thread.start()
        
        return download_id
    
    @staticmethod
    def _download_thread(download_id, url, mode, format, quality, download_path):
        """Executa o download usando a API Python do yt-dlp"""
        
        log_file = download_path / "download.log"
        
        def progress_hook(d):
            """Hook para atualizar progresso"""
            try:
                if d['status'] == 'downloading':
                    active_downloads[download_id]["status"] = "downloading"
                    
                    # Calcular progresso
                    if 'downloaded_bytes' in d and 'total_bytes' in d and d['total_bytes']:
                        progress = (d['downloaded_bytes'] / d['total_bytes']) * 100
                        active_downloads[download_id]["progress"] = min(progress, 99)
                    elif '_percent_str' in d:
                        try:
                            percent_str = d['_percent_str'].strip().replace('%', '')
                            active_downloads[download_id]["progress"] = float(percent_str)
                        except:
                            pass
                    
                    # Nome do arquivo atual
                    if 'filename' in d:
                        active_downloads[download_id]["current_track"] = Path(d['filename']).stem
                        
                elif d['status'] == 'finished':
                    active_downloads[download_id]["progress"] = 100
                    if 'filename' in d:
                        active_downloads[download_id]["current_track"] = f"Convertendo: {Path(d['filename']).stem}"
                        
                elif d['status'] == 'error':
                    if 'error' in d:
                        active_downloads[download_id]["error"] = str(d.get('error', 'Erro desconhecido'))
                        
            except Exception as e:
                print(f"Erro no progress_hook: {e}")
        
        try:
            # Atualizar status
            active_downloads[download_id]["status"] = "downloading"
            
            # Configurar opções do yt-dlp
            if mode == "playlist":
                output_template = str(download_path / "%(playlist_title)s" / "%(playlist_index)s - %(title)s.%(ext)s")
            else:
                output_template = str(download_path / "%(title)s.%(ext)s")
            
            def postprocessor_hook(d):
                """Hook para detectar quando pós-processamento termina"""
                try:
                    if d['status'] == 'finished':
                        active_downloads[download_id]["current_track"] = "Conversão completa!"
                        print(f"[{download_id}] Pós-processamento concluído: {d.get('info_dict', {}).get('title', 'arquivo')}")
                except Exception as e:
                    print(f"Erro no postprocessor_hook: {e}")
            
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': output_template,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': format,
                    'preferredquality': quality if quality != 'best' else '0',
                }],
                'progress_hooks': [progress_hook],
                'postprocessor_hooks': [postprocessor_hook],
                'noplaylist': mode != 'playlist',
                'ignoreerrors': True,
                'no_warnings': False,
                'quiet': False,
                'nocheckcertificate': True,
                'writethumbnail': False,  # Desabilitar thumbnail para evitar erros
                'embedthumbnail': False,
                'addmetadata': True,
            }
            
            # Log das opções
            with open(log_file, "w", encoding="utf-8") as f:
                f.write(f"URL: {url}\n")
                f.write(f"Mode: {mode}\n")
                f.write(f"Format: {format}\n")
                f.write(f"Quality: {quality}\n")
                f.write(f"Output: {output_template}\n")
                f.write("-" * 50 + "\n")
            
            print(f"[{download_id}] Iniciando download de: {url}")
            
            # Executar download
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Tentar baixar
                result = ydl.download([url])
                
                print(f"[{download_id}] Download retornou código: {result}")
                
                # Aguardar um pouco para garantir que arquivos foram escritos
                import time
                time.sleep(1)
                
                # Listar arquivos baixados (sempre verificar, independente do código de retorno)
                files = []
                print(f"[{download_id}] Buscando arquivos em: {download_path}")
                for ext in ["mp3", "m4a", "opus", "flac", "wav", "ogg"]:
                    for file in download_path.rglob(f"*.{ext}"):
                        if file.is_file():
                            print(f"[{download_id}] Arquivo encontrado: {file.name}")
                            files.append({
                                "name": file.name,
                                "size": file.stat().st_size,
                                "path": str(file.relative_to(DOWNLOAD_DIR))
                            })
                
                # Se encontrou arquivos, marcar como completo
                if files:
                    active_downloads[download_id]["status"] = "completed"
                    active_downloads[download_id]["progress"] = 100
                    active_downloads[download_id]["files"] = files
                    print(f"[{download_id}] Download COMPLETO! {len(files)} arquivo(s)")
                    
                    # Adicionar ao log
                    with open(log_file, "a", encoding="utf-8") as f:
                        f.write(f"\n\nDownload concluído!\n")
                        f.write(f"Arquivos: {len(files)}\n")
                        for file in files:
                            f.write(f"  - {file['name']} ({file['size']} bytes)\n")
                else:
                    # Nenhum arquivo encontrado
                    print(f"[{download_id}] FALHA - Nenhum arquivo encontrado")
                    active_downloads[download_id]["status"] = "failed"
                    active_downloads[download_id]["error"] = "Não foi possível baixar o áudio. Verifique se o link está correto."
                        
        except yt_dlp.utils.DownloadError as e:
            error_msg = str(e)
            if "404" in error_msg:
                active_downloads[download_id]["error"] = "Música não encontrada. O link pode estar incorreto ou a música foi removida."
            elif "403" in error_msg:
                active_downloads[download_id]["error"] = "Acesso negado pelo SoundCloud. A música pode estar restrita."
            elif "429" in error_msg:
                active_downloads[download_id]["error"] = "Muitas requisições. Aguarde alguns minutos e tente novamente."
            else:
                active_downloads[download_id]["error"] = f"Erro ao baixar: {error_msg[:200]}"
            active_downloads[download_id]["status"] = "failed"
            
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(f"\n\nERRO: {error_msg}\n")
                
        except Exception as e:
            active_downloads[download_id]["status"] = "failed"
            active_downloads[download_id]["error"] = f"Erro inesperado: {str(e)[:200]}"
            
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(f"\n\nERRO INESPERADO: {str(e)}\n")

# Rotas da API
@app.route('/api/download', methods=['POST'])
def api_download():
    """Inicia um novo download"""
    
    data = request.json
    
    if not data or 'url' not in data:
        return jsonify({"success": False, "error": "URL não fornecida"}), 400
    
    url = data['url']
    mode = data.get('mode', 'single')
    format = data.get('format', 'mp3')
    quality = data.get('quality', '192')
    
    # Validar URL
    if 'soundcloud.com' not in url:
        return jsonify({"success": False, "error": "URL deve ser do SoundCloud"}), 400
    
    # Verificar limite de downloads simultâneos
    active_count = sum(1 for d in active_downloads.values() 
                      if d['status'] in ['starting', 'downloading'])
    
    if active_count >= MAX_CONCURRENT_DOWNLOADS:
        return jsonify({
            "success": False, 
            "error": "Muitos downloads em andamento. Tente novamente em alguns instantes."
        }), 429
    
    # Iniciar download
    download_id = DownloadManager.start_download(url, mode, format, quality)
    
    return jsonify({
        "success": True,
        "downloadId": download_id,
        "message": "Download iniciado"
    })

@app.route('/api/status/<download_id>', methods=['GET'])
def api_status(download_id):
    """Obtém status de um download"""
    
    if download_id not in active_downloads:
        return jsonify({"success": False, "error": "Download não encontrado"}), 404
    
    return jsonify({
        "success": True,
        "status": active_downloads[download_id]
    })

@app.route('/api/info', methods=['GET'])
def api_info():
    """Obtém informações de uma música/playlist"""
    
    url = request.args.get('url')
    
    if not url:
        return jsonify({"success": False, "error": "URL não fornecida"}), 400
    
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
            'nocheckcertificate': True
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            if info:
                response = {
                    "title": info.get("title", "Música do SoundCloud"),
                    "artist": info.get("uploader", "Artista"),
                    "duration": info.get("duration"),
                    "thumbnail": info.get("thumbnail"),
                    "isPlaylist": info.get("_type") == "playlist"
                }
                
                return jsonify({"success": True, "info": response})
            else:
                return jsonify({
                    "success": False, 
                    "error": "Não foi possível obter informações"
                }), 500
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)[:200]}), 500

@app.route('/api/files/<download_id>', methods=['GET'])
def api_files(download_id):
    """Lista arquivos de um download completo"""
    
    if download_id not in active_downloads:
        return jsonify({"success": False, "error": "Download não encontrado"}), 404
    
    download_info = active_downloads[download_id]
    
    if download_info['status'] != 'completed':
        return jsonify({
            "success": False, 
            "error": "Download ainda não completo"
        }), 400
    
    return jsonify({
        "success": True,
        "files": download_info['files']
    })

@app.route('/download/<path:filepath>', methods=['GET'])
def download_file(filepath):
    """Serve um arquivo para download"""
    
    # Verificar se o caminho é seguro (está dentro de DOWNLOAD_DIR)
    full_path = DOWNLOAD_DIR / filepath
    
    # Resolver o caminho para verificar path traversal
    try:
        resolved = full_path.resolve()
        download_resolved = DOWNLOAD_DIR.resolve()
        if not str(resolved).startswith(str(download_resolved)):
            return "Acesso negado", 403
    except:
        return "Caminho inválido", 400
    
    if not full_path.exists() or not full_path.is_file():
        return "Arquivo não encontrado", 404
    
    # Verificar extensão permitida
    if full_path.suffix.lower() not in ['.mp3', '.m4a', '.opus', '.flac', '.wav', '.ogg']:
        return "Tipo de arquivo não permitido", 403
    
    # Obter apenas o nome do arquivo para o download
    filename = full_path.name
    
    return send_file(
        full_path,
        as_attachment=True,
        download_name=filename
    )

@app.route('/cleanup', methods=['POST'])
def cleanup():
    """Limpa downloads antigos (apenas para administração)"""
    
    # Remover downloads com mais de 1 hora
    current_time = time.time()
    to_remove = []
    
    for download_id, info in active_downloads.items():
        if current_time - info['start_time'] > 3600:  # 1 hora
            to_remove.append(download_id)
    
    for download_id in to_remove:
        # Tentar remover arquivos
        try:
            download_path = Path(active_downloads[download_id]['path'])
            if download_path.exists():
                import shutil
                shutil.rmtree(download_path)
        except:
            pass
        
        del active_downloads[download_id]
    
    return jsonify({
        "success": True,
        "removed": len(to_remove),
        "remaining": len(active_downloads)
    })

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
    
    print("🎵 SoundCloud Downloader API")
    print(f"🌐 Servidor iniciado em http://localhost:{port}")
    print("📁 Downloads serão salvos em: downloads/")
    print(f"📦 yt-dlp versão: {yt_dlp.version.__version__}")
    print("\nPressione Ctrl+C para parar o servidor\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)

