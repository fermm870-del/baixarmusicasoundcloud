class SoundCloudDownloader {
    constructor() {
        this.currentMode = 'single'; // 'single' ou 'playlist'
        this.currentDownloadId = null;
        this.downloadHistory = JSON.parse(localStorage.getItem('scDownloads') || '[]');

        this.initElements();
        this.bindEvents();
        this.loadHistory();
    }

    initElements() {
        // Elementos do DOM
        this.elements = {
            singleModeBtn: document.getElementById('singleModeBtn'),
            playlistModeBtn: document.getElementById('playlistModeBtn'),
            urlInput: document.getElementById('urlInput'),
            formatSelect: document.getElementById('formatSelect'),
            qualitySelect: document.getElementById('qualitySelect'),
            formatOptions: document.getElementById('formatOptions'),
            playlistOptions: document.getElementById('playlistOptions'),
            downloadBtn: document.getElementById('downloadBtn'),
            downloadText: document.getElementById('downloadText'),
            loading: document.getElementById('loading'),
            infoCard: document.getElementById('infoCard'),
            trackInfo: document.getElementById('trackInfo'),
            historyList: document.getElementById('historyList'),
            pasteBtn: document.getElementById('pasteBtn'),
            progressModal: document.getElementById('progressModal'),
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText'),
            progressDetails: document.getElementById('progressDetails'),
            cancelBtn: document.getElementById('cancelBtn'),
            urlHelp: document.getElementById('urlHelp')
        };
    }

    bindEvents() {
        // Alternar entre modos
        this.elements.singleModeBtn.addEventListener('click', () => this.switchMode('single'));
        this.elements.playlistModeBtn.addEventListener('click', () => this.switchMode('playlist'));

        // Colar URL
        this.elements.pasteBtn.addEventListener('click', () => this.pasteFromClipboard());

        // Validar URL em tempo real
        this.elements.urlInput.addEventListener('input', () => this.validateURL());

        // Botão de download
        this.elements.downloadBtn.addEventListener('click', () => this.startDownload());

        // Cancelar download
        this.elements.cancelBtn.addEventListener('click', () => this.cancelDownload());

        // Eventos do range para playlists
        const trackLimit = document.getElementById('limitTracks');
        const trackCount = document.getElementById('trackCount');

        trackLimit.addEventListener('input', (e) => {
            const value = e.target.value;
            trackCount.textContent = value === '0' ? 'Todas' : `${value} faixas`;
        });
    }

    switchMode(mode) {
        this.currentMode = mode;

        // Atualizar botões ativos
        this.elements.singleModeBtn.classList.toggle('active', mode === 'single');
        this.elements.playlistModeBtn.classList.toggle('active', mode === 'playlist');

        // Atualizar texto do botão
        this.elements.downloadText.textContent = mode === 'single'
            ? 'Baixar Música'
            : 'Baixar Playlist';

        // Mostrar/ocultar opções específicas
        this.elements.formatOptions.style.display = mode === 'single' ? 'block' : 'none';
        this.elements.playlistOptions.style.display = mode === 'playlist' ? 'block' : 'none';

        // Atualizar texto de ajuda
        this.elements.urlHelp.textContent = mode === 'single'
            ? 'Para músicas individuais: link deve conter "/artista/nome-da-musica"'
            : 'Para playlists: link deve conter "/sets/" na URL';

        // Limpar informações anteriores
        this.elements.infoCard.style.display = 'none';
        this.elements.urlInput.value = '';
    }

    async pasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            this.elements.urlInput.value = text;
            this.validateURL();
        } catch (err) {
            alert('Não foi possível acessar a área de transferência. Cole manualmente.');
        }
    }

    validateURL() {
        const url = this.elements.urlInput.value.trim();

        if (!url) {
            this.elements.infoCard.style.display = 'none';
            return false;
        }

        // Verificar se é URL válida do SoundCloud
        const isValid = url.includes('soundcloud.com');

        if (isValid) {
            // Extrair informações da URL
            this.extractURLInfo(url);
        } else {
            this.elements.infoCard.style.display = 'none';
        }

        return isValid;
    }

    extractURLInfo(url) {
        // Esta função simula extração de informações
        // Em um sistema real, você faria uma requisição para obter metadados

        const isPlaylist = url.includes('/sets/');
        const urlParts = url.split('/').filter(part => part);

        let infoHTML = '';

        if (isPlaylist) {
            const playlistName = this.extractPlaylistName(urlParts);
            infoHTML = `
                <div class="info-item">
                    <strong><i class="fas fa-list"></i> Tipo:</strong> Playlist
                </div>
                <div class="info-item">
                    <strong><i class="fas fa-headphones"></i> Nome:</strong> ${playlistName}
                </div>
                <div class="info-item">
                    <strong><i class="fas fa-user"></i> Artista:</strong> ${this.extractArtist(urlParts)}
                </div>
            `;
        } else {
            const trackName = this.extractTrackName(urlParts);
            infoHTML = `
                <div class="info-item">
                    <strong><i class="fas fa-music"></i> Tipo:</strong> Música Única
                </div>
                <div class="info-item">
                    <strong><i class="fas fa-headphones"></i> Música:</strong> ${trackName}
                </div>
                <div class="info-item">
                    <strong><i class="fas fa-user"></i> Artista:</strong> ${this.extractArtist(urlParts)}
                </div>
            `;
        }

        this.elements.trackInfo.innerHTML = infoHTML;
        this.elements.infoCard.style.display = 'block';
    }

    extractPlaylistName(parts) {
        const setsIndex = parts.indexOf('sets');
        if (setsIndex !== -1 && parts.length > setsIndex + 1) {
            return parts[setsIndex + 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        return 'Playlist do SoundCloud';
    }

    extractTrackName(parts) {
        const lastPart = parts[parts.length - 1];
        return lastPart.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    extractArtist(parts) {
        const soundcloudIndex = parts.indexOf('soundcloud.com');
        if (soundcloudIndex !== -1 && parts.length > soundcloudIndex + 1) {
            return parts[soundcloudIndex + 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        return 'Artista do SoundCloud';
    }

    async startDownload() {
        const url = this.elements.urlInput.value.trim();

        if (!url || !url.includes('soundcloud.com')) {
            alert('Por favor, insira um link válido do SoundCloud.');
            return;
        }

        // Coletar opções
        const options = {
            mode: this.currentMode,
            url: url,
            format: this.elements.formatSelect.value,
            quality: this.elements.qualitySelect.value,
            createFolder: document.getElementById('createFolder').checked,
            numberTracks: document.getElementById('numberTracks').checked,
            limitTracks: document.getElementById('limitTracks').value
        };

        // Mostrar loading
        this.elements.loading.style.display = 'flex';
        this.elements.downloadBtn.disabled = true;

        try {
            // Mostrar modal de progresso
            this.showProgressModal();
            this.elements.progressText.textContent = 'Iniciando download...';

            // Fazer requisição real para o backend
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: options.url,
                    mode: options.mode,
                    format: options.format,
                    quality: options.quality
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Erro ao iniciar download');
            }

            // Guardar ID do download
            this.currentDownloadId = data.downloadId;

            // Adicionar ao histórico
            this.addToHistory(url, options.mode);

            // Monitorar progresso do download
            this.monitorDownload(data.downloadId, options);

        } catch (error) {
            this.elements.progressModal.style.display = 'none';
            this.elements.loading.style.display = 'none';
            this.elements.downloadBtn.disabled = false;
            alert('Erro ao iniciar download: ' + error.message);
        }
    }

    async monitorDownload(downloadId, options) {
        const checkStatus = async () => {
            try {
                const response = await fetch(`/api/status/${downloadId}`);
                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'Erro ao verificar status');
                }

                const status = data.status;

                // Atualizar progresso
                this.elements.progressFill.style.width = `${status.progress}%`;

                // Atualizar texto baseado no status
                if (status.status === 'starting') {
                    this.elements.progressText.textContent = 'Preparando download...';
                } else if (status.status === 'downloading') {
                    this.elements.progressText.textContent = `Baixando... ${Math.round(status.progress)}%`;
                } else if (status.status === 'completed') {
                    // Download completo!
                    this.elements.progressFill.style.width = '100%';
                    this.elements.progressText.textContent = 'Download completo!';

                    // Esperar um pouco e processar arquivos
                    setTimeout(() => {
                        this.handleDownloadComplete(downloadId, status.files, options);
                    }, 500);
                    return;
                } else if (status.status === 'failed') {
                    throw new Error(status.error || 'Download falhou');
                }

                // Continuar verificando
                if (this.currentDownloadId === downloadId) {
                    setTimeout(checkStatus, 1000);
                }

            } catch (error) {
                this.elements.progressModal.style.display = 'none';
                this.elements.loading.style.display = 'none';
                this.elements.downloadBtn.disabled = false;
                alert('Erro no download: ' + error.message);
            }
        };

        // Iniciar verificação
        checkStatus();
    }

    handleDownloadComplete(downloadId, files, options) {
        // Fechar modal
        this.elements.progressModal.style.display = 'none';
        this.elements.loading.style.display = 'none';
        this.elements.downloadBtn.disabled = false;
        this.elements.progressFill.style.width = '0%';
        this.currentDownloadId = null;

        if (files && files.length > 0) {
            // Baixar cada arquivo
            files.forEach((file, index) => {
                setTimeout(() => {
                    const link = document.createElement('a');
                    link.href = `/download/${file.path}`;
                    link.download = file.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }, index * 500);
            });

            const message = options.mode === 'playlist'
                ? `${files.length} músicas baixadas com sucesso!`
                : 'Música baixada com sucesso!';
            alert(message);
        } else {
            alert('Download completo, mas nenhum arquivo foi encontrado.');
        }
    }

    showProgressModal() {
        this.elements.progressModal.style.display = 'flex';
        this.currentDownloadId = Date.now();
    }

    simulateProgress(options) {
        let progress = 0;
        const interval = setInterval(() => {
            if (!this.currentDownloadId) {
                clearInterval(interval);
                return;
            }

            progress += Math.random() * 10;

            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);

                // Download "completo"
                setTimeout(() => {
                    this.completeDownload(options);
                }, 500);
            }

            this.updateProgress(progress, options);
        }, 300);
    }

    updateProgress(progress, options) {
        this.elements.progressFill.style.width = `${progress}%`;

        const stages = options.mode === 'playlist'
            ? ['Analisando playlist...', 'Extraindo informações...', 'Baixando faixas...', 'Convertendo áudio...', 'Finalizando...']
            : ['Analisando música...', 'Baixando áudio...', 'Convertendo formato...', 'Adicionando metadados...', 'Finalizando...'];

        const stageIndex = Math.floor(progress / 20);
        this.elements.progressText.textContent = stages[stageIndex] || 'Processando...';

        // Detalhes para playlists
        if (options.mode === 'playlist') {
            const totalTracks = options.limitTracks > 0 ? options.limitTracks : 10;
            const currentTrack = Math.floor((progress / 100) * totalTracks);

            this.elements.progressDetails.innerHTML = `
                <div class="detail-item">
                    <strong>Faixa:</strong> ${currentTrack} de ${totalTracks}
                </div>
                <div class="detail-item">
                    <strong>Formato:</strong> ${options.format.toUpperCase()}
                </div>
                <div class="detail-item">
                    <strong>Qualidade:</strong> ${options.quality === 'best' ? 'Melhor' : options.quality + ' kbps'}
                </div>
            `;
        }
    }

    completeDownload(options) {
        // Fechar modal
        this.elements.progressModal.style.display = 'none';
        this.elements.loading.style.display = 'none';
        this.elements.downloadBtn.disabled = false;

        // Resetar progresso
        this.elements.progressFill.style.width = '0%';
        this.currentDownloadId = null;

        // Mostrar mensagem de sucesso
        const message = options.mode === 'playlist'
            ? `Playlist baixada com sucesso! ${options.limitTracks > 0 ? `(${options.limitTracks} faixas)` : ''}`
            : 'Música baixada com sucesso!';

        alert(message);

        // Em um sistema real, aqui você forneceria o link para download
        console.log('Download completo:', options);
    }

    cancelDownload() {
        if (this.currentDownloadId) {
            if (confirm('Tem certeza que deseja cancelar o download?')) {
                this.currentDownloadId = null;
                this.elements.progressModal.style.display = 'none';
                this.elements.loading.style.display = 'none';
                this.elements.downloadBtn.disabled = false;
                this.elements.progressFill.style.width = '0%';

                alert('Download cancelado.');
            }
        }
    }

    addToHistory(url, mode) {
        const historyItem = {
            id: Date.now(),
            url: url,
            mode: mode,
            date: new Date().toLocaleDateString('pt-BR'),
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };

        this.downloadHistory.unshift(historyItem);

        // Manter apenas os últimos 10 itens
        if (this.downloadHistory.length > 10) {
            this.downloadHistory = this.downloadHistory.slice(0, 10);
        }

        localStorage.setItem('scDownloads', JSON.stringify(this.downloadHistory));
        this.loadHistory();
    }

    loadHistory() {
        if (this.downloadHistory.length === 0) {
            this.elements.historyList.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-history"></i>
                    <p>Nenhum download recente</p>
                </div>
            `;
            return;
        }

        let html = '';

        this.downloadHistory.forEach(item => {
            const title = item.mode === 'playlist' ? 'Playlist' : 'Música';
            const icon = item.mode === 'playlist' ? 'fa-list' : 'fa-music';

            html += `
                <div class="history-item">
                    <div>
                        <i class="fas ${icon}"></i>
                        <strong>${title}</strong>
                        <p class="url-truncate">${item.url.substring(0, 40)}...</p>
                    </div>
                    <div class="date">
                        ${item.date} ${item.time}
                    </div>
                </div>
            `;
        });

        this.elements.historyList.innerHTML = html;
    }
}

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    const downloader = new SoundCloudDownloader();

    // Adicionar CSS para detalhes
    const style = document.createElement('style');
    style.textContent = `
        .info-item {
            margin: 8px 0;
            padding: 8px;
            background: white;
            border-radius: 5px;
            border-left: 3px solid #667eea;
        }
        .detail-item {
            margin: 5px 0;
            font-size: 0.9rem;
        }
        .url-truncate {
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .empty-history {
            text-align: center;
            padding: 20px;
            color: #6c757d;
        }
        .empty-history i {
            font-size: 2rem;
            margin-bottom: 10px;
            opacity: 0.5;
        }
    `;
    document.head.appendChild(style);
});
