# ====================================================================
# UniLink Backend - Dockerfile Multi-Arquitectura (ARM64 / x86_64)
# Optimizado para Oracle Cloud Free Tier (Ampere A1 / ARM64)
# ====================================================================

FROM node:20-alpine AS runner

WORKDIR /app

# Instalar dependencias esenciales de sistema para Alpine Linux
RUN apk add --no-cache tzdata

ENV NODE_ENV=production
ENV PORT=5000

# Copiar archivos de dependencias
COPY backend/package*.json ./backend/

WORKDIR /app/backend

# Instalación limpia en modo producción
RUN npm install --omit=dev

# Copiar código fuente del backend y esquema SQL
COPY backend/ ./

# Crear directorio para almacenamiento de archivos estáticos persistentes
RUN mkdir -p /app/backend/uploads && chmod 777 /app/backend/uploads

EXPOSE 5000

# Salud del contenedor
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
