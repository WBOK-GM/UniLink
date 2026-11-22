# 🚀 Guía de Despliegue en Producción: Vercel + Render + Neon + Cloudflare R2

Esta guía detalla el paso a paso exacto para desplegar **UniLink PWA** en la arquitectura recomendada en la nube, 100% gratuita, con HTTPS automático, persistencia en base de datos PostgreSQL y almacenamiento permanente para archivos académicos.

---

## 🏗️ 1. Resumen de la Arquitectura

```mermaid
flowchart TD
    Estudiante["📱 Estudiante (PWA Móvil / Desktop)"]
    
    subgraph VercelEdge["Frontend: Vercel (Siempre Encendido)"]
        VercelCDN["🌐 Vercel Edge CDN (HTTPS Nativo)"]
        SPA["⚛️ React PWA + Vite\n- Service Worker (sw.js)\n- Manifest & Cache-Control\n- SPA Rewrites (vercel.json)"]
        VercelCDN --> SPA
    end

    subgraph KeepAliveService["Keep-Alive: UptimeRobot"]
        Ping["⏱️ Ping cada 5 minutos\nGET https://...onrender.com/health"]
    end

    subgraph RenderService["Backend: Render (Web Service Gratis)"]
        ExpressAPI["⚡ Node.js 20 & Express REST API\n- Verificación Criptográfica SHA-256\n- Rate Limiting (Health excluido)\n- Subida a Cloudflare R2"]
    end

    subgraph CloudStorage["Persistencia en la Nube"]
        NeonPostgres[("🐘 Neon PostgreSQL\n- Serverless DB con SSL\n- 15 Tablas Normalizadas")]
        R2Storage[("☁️ Cloudflare R2 (S3)\n- 10 GB Almacenamiento Gratis\n- 0 Costo de Transferencia / Egreso")]
    end

    Estudiante -->|1. Carga PWA Shell & Assets| VercelCDN
    Estudiante -->|2. Peticiones API (VITE_API_URL)| ExpressAPI
    Ping -.->|Keep-Alive| ExpressAPI
    ExpressAPI -->|Consultas SQL| NeonPostgres
    ExpressAPI -->|Upload / Download de Archivos| R2Storage
```

---

## 📋 Comparativa de Recursos en Planes Gratuitos

| Servicio | Rol en UniLink | Capacidad Gratuita | ¿Se Duerme / Expira? |
| :--- | :--- | :--- | :--- |
| **Vercel** | Frontend PWA | Tráfico ilimitado, SSL automático, Edge CDN | 🟢 **Nunca se duerme** (100% encendido) |
| **Render** | Backend API | 750 horas/mes gratuitas, 512 MB RAM | 🟡 Se suspende tras 15 min sin tráfico (se resuelve con **UptimeRobot**) |
| **Neon** | Base de Datos | 0.5 GiB de almacenamiento PostgreSQL, cómputo serverless | 🟢 **No expira** (a diferencia de la BD de Render que expira a los 30 días) |
| **Cloudflare R2** | Almacenamiento | 10 GB de archivos, 10M operaciones de lectura/mes | 🟢 **Permanente**, sin cobros por descarga (0 egress fee) |
| **UptimeRobot** | Keep-Alive | 50 monitores, verificaciones cada 5 minutos | 🟢 **Gratis para siempre** |

---

## 🐘 Paso 1: Configurar la Base de Datos en Neon PostgreSQL

1. Ingresa a [neon.tech](https://neon.tech/) e inicia sesión con tu cuenta de GitHub o Google.
2. Haz clic en **Create Project**:
   - **Name**: `unilink-production-db`
   - **Region**: Selecciona `US East (Ohio / N. Virginia)` o la más cercana.
   - **PostgreSQL Version**: `16` (predeterminada).
3. Una vez creado el proyecto, copia la **Connection String** que aparece en el Dashboard. Debe verse similar a:
   ```text
   postgres://alex:AbC123xyz@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. **Inicializar las tablas y datos de prueba automáticamente**:
   Abre una terminal en tu proyecto local y ejecuta:
   ```bash
   DATABASE_URL="postgres://tu-usuario:tu-pass@ep-xyz.neon.tech/neondb?sslmode=require" npm run db:init
   ```
   *(El script `scripts/init_db.js` creará las 15 tablas normalizadas, las categorías base y los usuarios de prueba oficiales `estudiante@unilink.edu.co` y `admin@unilink.edu.co`).*

---

## ☁️ Paso 2: Configurar Almacenamiento Persistente en Cloudflare R2 (Opcional pero Recomendado)

> [!NOTE]
> Render tiene un sistema de archivos efímero: si el backend se reinicia, los archivos guardados en el disco local se borran. Cloudflare R2 resuelve esto almacenando los PDFs, imágenes y audios de forma permanente y gratuita.

1. Ve a [dash.cloudflare.com](https://dash.cloudflare.com/) y accede a **R2** en el menú lateral.
2. Haz clic en **Create bucket**:
   - **Bucket name**: `unilink-academic-files`
   - **Location**: Automatic.
3. En la pestaña **Settings** del bucket:
   - En la sección **Public access**, haz clic en **Allow Access** o activa el subdominio público **R2.dev subdomain** (ejemplo: `https://pub-abc123def456.r2.dev`).
4. Generar credenciales de API S3:
   - En el menú principal de R2, haz clic en **Manage R2 API Tokens** > **Create API Token**.
   - **Permissions**: `Object Read & Write`.
   - Copia los siguientes valores:
     - **Account ID** (aparece a la derecha del dashboard de R2).
     - **Access Key ID**.
     - **Secret Access Key**.

---

## ⚡ Paso 3: Desplegar el Backend en Render

1. Ve a [dashboard.render.com](https://dashboard.render.com/) e inicia sesión con GitHub.
2. Haz clic en **New +** y selecciona **Web Service**.
3. Selecciona tu repositorio de GitHub `UniLink`.
4. Configura los parámetros del servicio:
   - **Name**: `unilink-backend`
   - **Region**: `Oregon (US West)` u `Ohio (US East)`
   - **Branch**: `develop` (o tu rama principal)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Configura las **Environment Variables** en la sección *Advanced*:

| Variable | Valor Recomendado |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `JWT_SECRET` | `Una_Clave_Secreta_Larga_Y_Segura_UPTC_2026!` |
| `JWT_EXPIRES_IN` | `7d` |
| `DATABASE_URL` | *(Pega tu Connection String de Neon con `?sslmode=require`)* |
| `CLOUDFLARE_R2_ACCOUNT_ID` | *(Tu Account ID de Cloudflare)* |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | *(Tu Access Key ID de R2)* |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | *(Tu Secret Access Key de R2)* |
| `CLOUDFLARE_R2_BUCKET_NAME` | `unilink-academic-files` |
| `CLOUDFLARE_R2_PUBLIC_DOMAIN` | `https://pub-tu-bucket.r2.dev` |

6. Haz clic en **Create Web Service**.
7. Espera a que termine la compilación. Render te dará una URL pública, por ejemplo:
   ```text
   https://unilink-backend.onrender.com
   ```
8. **Verificación rápida**:
   Abre en tu navegador `https://unilink-backend.onrender.com/health`. Debe responder:
   ```json
   {
     "status": "healthy",
     "service": "UniLink API REST",
     "version": "1.0.0"
   }
   ```

---

## 🌐 Paso 4: Desplegar el Frontend PWA en Vercel

1. Ingresa a [vercel.com](https://vercel.com/) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **Add New...** > **Project**.
3. Selecciona el repositorio `UniLink`.
4. En la configuración del proyecto:
   - **Framework Preset**: `Vite` (se detecta automáticamente).
   - **Root Directory**: Haz clic en *Edit* y selecciona la carpeta **`frontend`**.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. En la sección **Environment Variables**, añade:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://unilink-backend.onrender.com/api/v1` *(usa la URL que te dio Render en el Paso 3)*.
6. Haz clic en **Deploy**.
7. En unos 45 segundos, Vercel te entregará una URL con HTTPS y CDN mundial, por ejemplo:
   ```text
   https://unilink-community.vercel.app
   ```
8. Gracias a `frontend/vercel.json`, todas las rutas directas de React Router (como `/recursos`, `/grupos`, `/perfil`) recargarán limpiamente sin dar error 404, y el `sw.js` se mantendrá con cabeceras de no-caché para actualizaciones instantáneas.

---

## ⏱️ Paso 5: Configurar Keep-Alive con UptimeRobot (Evitar Suspensión de Render)

El plan gratuito de Render suspende los servicios tras 15 minutos sin peticiones entrantes. Para mantenerlo siempre despierto durante tu sustentación y pruebas:

1. Ve a [uptimerobot.com](https://uptimerobot.com/) y crea una cuenta gratuita.
2. Haz clic en **Add New Monitor**:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `UniLink Render KeepAlive`
   - **URL (or IP)**: `https://unilink-backend.onrender.com/health`
   - **Monitoring Interval**: `Every 5 minutes`
3. Haz clic en **Create Monitor**.
4. ¡Listo! UptimeRobot enviará un ping HTTP cada 5 minutos al endpoint `/health`. Como este endpoint está expresamente exento de Rate Limiting en el backend de UniLink, tu servidor se mantendrá activo las 24 horas del día.

---

## ✅ Paso 6: Lista de Verificación en Producción

Una vez desplegado:
1. **Inicio de Sesión**:
   - Abre la PWA en tu navegador o celular desde la URL de Vercel.
   - Ingresa con `estudiante@unilink.edu.co` y contraseña `123456`.
2. **Subida con Integridad SHA-256**:
   - Crea una publicación adjuntando un archivo PDF o imagen.
   - Observa cómo se calcula el hash SHA-256 en el cliente y se persiste en Cloudflare R2 / Neon.
3. **Instalación de la PWA**:
   - Haz clic en el botón de la barra del navegador o menú móvil: *"Instalar aplicación" / "Agregar a pantalla de inicio"*.
   - Comprueba el icono institucional y la pantalla de carga (Splash).
4. **Auditoría de Seguridad y PWA**:
   - Ingresa como administrador con `admin@unilink.edu.co` y `123456`.
   - Abre el portal administrativo y corre la auditoría: debe marcar **Calificación A+ / 100% de cumplimiento**.
5. **Modo Offline**:
   - Activa el Modo Avión o desconecta tu Wi-Fi.
   - Navega por los apuntes y archivos guardados localmente en IndexedDB.
