================================================================================
                    🎵 SOUNDCLOUD DOWNLOADER - GUIA DE USO 🎵
================================================================================

📋 DESCRIÇÃO
------------
Ferramenta para baixar músicas e playlists do SoundCloud em formato MP3.


🚀 COMO INICIAR
---------------
1. Abra o terminal/PowerShell na pasta do projeto
2. Execute: python server.py
3. Acesse no navegador: http://localhost:5000


📥 COMO BAIXAR MÚSICAS
----------------------

MÚSICA ÚNICA:
1. Clique em "Música Única" (modo padrão)
2. Cole o link da música do SoundCloud
   Exemplo: https://soundcloud.com/artista/nome-da-musica
3. Escolha o formato (MP3 recomendado) e qualidade (192 kbps)
4. Clique em "Baixar Música"
5. Aguarde o download completar

PLAYLIST COMPLETA:
1. Clique em "Playlist Completa"
2. Cole o link da playlist (deve conter /sets/ no link)
   Exemplo: https://soundcloud.com/artista/sets/nome-da-playlist
3. Escolha formato e qualidade
4. Clique em "Baixar Playlist"
5. Aguarde todas as músicas serem baixadas


📁 ONDE FICAM AS MÚSICAS
------------------------
Os arquivos são salvos em: downloads/[ID]/[Nome da Playlist ou Música]/

Cada download cria uma pasta com ID único contendo:
- Arquivos MP3 das músicas
- Capas das músicas (JPG)


⚙️ CONFIGURAÇÕES
----------------
FORMATO:
- MP3 (Recomendado) - Compatível com todos dispositivos
- M4A - Boa qualidade, menor tamanho
- FLAC - Sem perda de qualidade (arquivo maior)
- WAV - Sem compressão (arquivo muito grande)

QUALIDADE:
- 320 kbps - Máxima qualidade
- 256 kbps - Alta qualidade
- 192 kbps - Qualidade padrão (recomendado)
- 128 kbps - Qualidade básica


⚠️ OBSERVAÇÕES IMPORTANTES
--------------------------
- Alguns links podem não funcionar se a música estiver bloqueada na sua região
- Músicas brasileiras geralmente funcionam sem problemas
- Se aparecer erro 404, tente outro link ou use VPN
- O servidor deve estar rodando para usar a interface web


🛠️ REQUISITOS
--------------
- Python 3.8 ou superior
- yt-dlp (pip install yt-dlp)
- ffmpeg (para conversão de áudio)
- Flask (pip install flask flask-cors)


📞 PROBLEMAS COMUNS
-------------------
"Download fica travado":
→ O link pode estar bloqueado, tente outro

"Erro 404":
→ A música foi removida ou está restrita na sua região

"Servidor não inicia":
→ Verifique se Python e dependências estão instalados


================================================================================
                         Desenvolvido com ❤️ para você
================================================================================
