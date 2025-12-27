FROM python:3.11-slim

# Instalar ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Diretório de trabalho
WORKDIR /app

# Copiar requirements primeiro (para cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Criar pasta de downloads
RUN mkdir -p downloads

# Porta
EXPOSE 5000

# Iniciar com gunicorn (1 worker para manter estado em memória + threads para concorrência)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--threads", "4", "--timeout", "600", "server:app"]
