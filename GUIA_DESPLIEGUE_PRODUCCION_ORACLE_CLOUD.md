# 🚀 Guía de Despliegue en Producción: UniLink PWA en Oracle Cloud Infrastructure (OCI)

Esta guía detalla el procedimiento paso a paso para desplegar **UniLink PWA** en un entorno de producción de alta disponibilidad utilizando la infraestructura gratuita **Always Free** de **Oracle Cloud Infrastructure (OCI)** con procesadores **ARM64 (Ampere Altra A1)**, contenedores Docker y proxy inverso seguro Nginx con SSL Let's Encrypt.

---

## 🏗️ 1. Arquitectura de Despliegue

```mermaid
flowchart TD
    Client["📱 Navegador / PWA Móvil & Desktop"]
    Internet(("🌐 Internet (HTTPS)"))
    
    subgraph OCI["Oracle Cloud Infrastructure (Ampere A1 ARM64)"]
        Firewall["🛡️ VCN Security List & iptables (Puertos 80, 443, 22)"]
        Nginx["🌐 Nginx Reverse Proxy (SSL / TLS Let's Encrypt)"]
        
        subgraph DockerNet["Red Docker Interna (unilink-network)"]
            NodeApp["⚡ Backend Node.js 20 & PWA Dist (Puerto 5000)\n- Integridad SHA-256\n- Retención LRU 10 días"]
            Postgres["🐘 PostgreSQL 16 Alpine\n- Base de Datos Centralizada\n- Límite de Memoria: 768 MB"]
            StorageVol[("💾 Volumen Persistente OCI\n/app/uploads & /var/lib/postgresql")]
        end
    end
    
    Client -->|HTTPS / WSS| Internet
    Internet --> Firewall
    Firewall --> Nginx
    Nginx -->|Proxy Pass| NodeApp
    NodeApp --> Postgres
    NodeApp -.-> StorageVol
    Postgres -.-> StorageVol
```

---

## 📦 2. Requisitos Previos y Dimensionamiento

### Cuenta OCI Always Free
Oracle Cloud proporciona gratuitamente:
- **Procesador**: Hasta 4 núcleos OCPU de arquitectura ARM Ampere A1.
- **Memoria RAM**: Hasta 24 GB de memoria para distribuir libremente.
- **Almacenamiento**: Hasta 200 GB en Block Volume NVMe.
- **Ancho de banda**: 10 TB mensuales salientes.

### Dimensionamiento Recomendado para UniLink (2000 usuarios)
- **Instancia**: `VM.Standard.A1.Flex`
- **OCPUs**: 2 a 4 núcleos
- **Memoria RAM**: 12 a 16 GB (amplio margen para Node.js, PostgreSQL y caché de archivos)
- **Sistema Operativo**: **Canonical Ubuntu 22.04 LTS (aarch64 / ARM64)**

---

## ☁️ 3. Paso a Paso: Aprovisionamiento en OCI

### 3.1. Crear la Instancia Compute en OCI Console
1. Inicia sesión en la consola de Oracle Cloud (`cloud.oracle.com`).
2. Ve a **Compute** > **Instances** > **Create Instance**.
3. **Nombre**: `unilink-production-server`.
4. **Image and Shape**:
   - Cambia la imagen a **Ubuntu 22.04 Minimal** o **Ubuntu 22.04 LTS** (arquitectura **ARM**).
   - En Shape selecciona **Ampere**: 2 OCPU, 12 GB RAM.
5. **Networking**: Selecciona la VCN predeterminada y marca **Assign a public IPv4 address**.
6. **SSH Keys**: Descarga la clave privada generada (`ssh-key-unilink.key`) o pega tu clave pública.
7. Haz clic en **Create**.

---

### 3.2. Configuración de Reglas de Entrada (VCN Security List)
Para que el servidor sea accesible vía web, debes habilitar los puertos en OCI:
1. En la página de la instancia, haz clic en la **Virtual Cloud Network (VCN)** asignada.
2. Haz clic en **Security Lists** > **Default Security List for...**.
3. Haz clic en **Add Ingress Rules**:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: `TCP`
   - **Destination Port Range**: `80,443,5000`
   - **Description**: `Trafico Web HTTP, HTTPS y UniLink API`
4. Guarda las reglas.

---

### 3.3. Configuración del Firewall Interno del Sistema Operativo (`iptables`)
Por defecto, las imágenes de Ubuntu en OCI incluyen reglas estrictas de filtrado iptables. Conéctate por SSH y ejecuta:

```bash
# Conectar por SSH (sustituye IP_PUBLICA_OCI por la IP asignada)
ssh -i ssh-key-unilink.key ubuntu@<IP_PUBLICA_OCI>

# Abrir puertos 80 (HTTP) y 443 (HTTPS) en el firewall de Ubuntu
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# Persistir las reglas para que sobrevivan a reinicios
sudo netfilter-persistent save
```

---

## 🛠️ 4. Instalación de Docker y Docker Compose en ARM64

Ejecuta en la terminal de la máquina virtual de Oracle Cloud:

```bash
# 1. Actualizar el sistema de paquetes
sudo apt update && sudo apt upgrade -y

# 2. Instalar utilidades básicas y certificados
sudo apt install -y ca-certificates curl gnupg lsb-release git nginx certbot python3-certbot-nginx

# 3. Agregar clave GPG oficial de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 4. Configurar repositorio de Docker para arquitectura ARM64
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. Instalar Docker Engine y Docker Compose V2
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 6. Añadir el usuario 'ubuntu' al grupo docker para evitar sudo
sudo usermod -aG docker ubuntu
newgrp docker

# 7. Verificar compatibilidad ARM64
docker --version
docker compose version
uname -m # Debe retornar aarch64
```

---

## 📂 5. Clonación del Repositorio y Configuración de Entorno

```bash
# 1. Clonar el repositorio del proyecto
cd ~
git clone https://github.com/tu-usuario/UniLink.git
cd UniLink

# 2. Asegurarse de estar en la rama de desarrollo/producción
git checkout develop

# 3. Crear el archivo de variables de entorno de producción
cp .env.example .env 2>/dev/null || true
nano .env
```

Configura tu archivo `.env` con valores seguros para producción:

```ini
# --- Configuración UniLink Producción (Oracle Cloud ARM64) ---
NODE_ENV=production
PORT=5000

# Seguridad de Tokens JWT (genera una clave aleatoria de al menos 32 caracteres)
JWT_SECRET=UniLink_Campus_Secr3t_Pr0d_Key_2026_AmpereARM_SecureToken!

# Base de Datos PostgreSQL
POSTGRES_DB=unilink_db
POSTGRES_USER=unilink_admin
POSTGRES_PASSWORD=ClaveUltraSeguraUniLink2026!
DATABASE_URL=postgres://unilink_admin:ClaveUltraSeguraUniLink2026!@postgres:5432/unilink_db

# Política de Retención y Almacenamiento Escalable (LRU)
STORAGE_RETENTION_DAYS=10
STORAGE_MAX_TOTAL_MB=4096
STORAGE_AUTO_CLEAN_INTERVAL_HOURS=24
UPLOAD_DIR=/app/uploads
```

---

## 🚀 6. Construcción y Lanzamiento con Docker Compose Multi-Arch

El archivo `docker-compose.yml` de UniLink está optimizado para compilar nativamente en ARM64 gracias a la imagen `node:20-alpine` y `postgres:16-alpine`:

```bash
# Construir imágenes y levantar servicios en segundo plano
docker compose up -d --build

# Verificar el estado de los contenedores
docker compose ps

# Comprobar registros de inicio
docker compose logs -f app
```

La salida esperada confirmará la base de datos PostgreSQL lista y el servidor Express escuchando en el puerto 5000 con los módulos de verificación criptográfica SHA-256 y retención de 10 días activos.

---

## 🔒 7. Configuración de Nginx Reverse Proxy y Certificado SSL

Nginx actúa como el punto de entrada principal (reverse proxy), gestionando el certificado SSL gratuito emitido por Let's Encrypt y optimizando la entrega de los activos estáticos y de la PWA.

### 7.1. Crear archivo de configuración en Nginx
```bash
sudo nano /etc/nginx/sites-available/unilink
```

Pega la siguiente configuración (reemplaza `tu-dominio.edu.co` por tu subdominio o IP pública):

```nginx
server {
    listen 80;
    server_name tu-dominio.edu.co www.tu-dominio.edu.co;

    client_max_body_size 30M;

    # Headers de seguridad recomendados
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Políticas de caché para PWA:
    # 1. El Service Worker NUNCA debe almacenarse en caché
    location /sw.js {
        proxy_pass http://127.0.0.1:5000/sw.js;
        proxy_set_header Host $host;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        expires 0;
    }

    # 2. Manifiesto web de la PWA
    location /manifest.json {
        proxy_pass http://127.0.0.1:5000/manifest.json;
        proxy_set_header Host $host;
        add_header Cache-Control "no-cache";
    }

    # 3. Módulos y rutas administrativas: NUNCA almacenar en caché
    location /api/v1/security/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
    }

    # 4. Proxy general para la aplicación y API
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
    }
}
```

Habilitar el sitio y reiniciar Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/unilink /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default 2>/dev/null || true
sudo nginx -t
sudo systemctl reload nginx
```

### 7.2. Obtención de Certificado SSL Gratuito con Certbot
```bash
# Obtener e instalar automáticamente el certificado SSL
sudo certbot --nginx -d tu-dominio.edu.co -d www.tu-dominio.edu.co

# Certbot configurará la redirección automática de HTTP (80) a HTTPS (443)
# Comprobar la renovación automática
sudo certbot renew --dry-run
```

---

## 🧹 8. Tarea Programada de Mantenimiento y Purga LRU (Cron)

El servidor UniLink ya cuenta con el servicio en segundo plano `storageRetentionService.js` que se ejecuta periódicamente. Adicionalmente, puedes configurar un cron job en el host para ejecutar una verificación diaria:

```bash
# Editar crontab del usuario ubuntu
crontab -e
```

Añadir al final del archivo:
```bash
# Ejecutar mantenimiento de retención de 10 días todos los días a las 03:00 AM
0 3 * * * docker compose -f /home/ubuntu/UniLink/docker-compose.yml exec -T app node -e "require('./src/services/storageRetentionService').runRetentionPrune({ retentionDays: 10 })" >> /home/ubuntu/retention_cron.log 2>&1
```

---

## 💾 9. Procedimiento de Respaldo de Base de Datos (Backup)

```bash
# Crear script de backup en ~/backup_unilink.sh
cat << 'EOF' > ~/backup_unilink.sh
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

docker compose -f /home/ubuntu/UniLink/docker-compose.yml exec -T postgres pg_dump -U unilink_admin unilink_db | gzip > "$BACKUP_DIR/unilink_db_$TIMESTAMP.sql.gz"

# Mantener solo los últimos 15 días de copias
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +15 -delete
echo "Backup completado: unilink_db_$TIMESTAMP.sql.gz"
EOF

chmod +x ~/backup_unilink.sh
```

---

## 🔍 10. Comandos Útiles de Operación y Monitoreo

| Operación | Comando |
| :--- | :--- |
| **Ver logs del backend en vivo** | `docker compose logs -f app` |
| **Ver logs de PostgreSQL** | `docker compose logs -f postgres` |
| **Reiniciar la aplicación** | `docker compose restart app` |
| **Consumo de CPU y RAM de contenedores** | `docker stats` |
| **Entrar a la terminal del backend** | `docker compose exec app sh` |
| **Entrar a psql en la base de datos** | `docker compose exec postgres psql -U unilink_admin -d unilink_db` |
| **Auditar espacio en disco de subidas** | `du -sh /home/ubuntu/UniLink/backend/uploads` |
