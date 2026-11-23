# 🎓 UniLink — Plataforma PWA de Colaboración y Comunidad Académica

**UniLink** es una aplicación web progresiva (**Progressive Web App - PWA**) de alto rendimiento diseñada para enriquecer la experiencia de aprendizaje y colaboración universitaria. Centraliza el intercambio seguro de apuntes, resúmenes y recursos multimedia, el descubrimiento de grupos de estudio presenciales mediante geolocalización interactiva, y garantiza una operatividad ininterrumpida gracias a su arquitectura **Offline-First** con sincronización en segundo plano.

---

## 🌟 Características Principales

### 📶 Arquitectura Offline-First & Resiliencia
- **Almacenamiento Local Dual**: Uso de **Cache Storage** para el App Shell (HTML, CSS, JS, iconos) y **IndexedDB** (vía *Dexie.js*) para publicaciones, credenciales de sesión en caché y archivos descargados.
- **Sincronización Bidireccional en Segundo Plano**: Las publicaciones y acciones creadas sin conexión a internet se encolan automáticamente (`PENDING`) y se sincronizan de forma transparente tan pronto se restablece la red.
- **Control de Almacenamiento en Cliente**: Selector interactivo `[✓] Guardar para ver sin conexión` por publicación y panel de administración local con cálculo exacto de MB utilizados y liberación selectiva de memoria.

### 👥 Modo Invitado (*Modo Explorador*)
- **Acceso Inmediato**: Permite a visitantes y nuevos estudiantes explorar el Feed académico, visualizar apuntes compartidos, consultar el mapa y explorar los grupos de estudio sin requerir registro previo.
- **Seguridad y Privacidad**: Las acciones de escritura (crear posts, subir apuntes, fundar grupos de estudio o modificar perfiles) están protegidas y presentan llamados a la acción guiados hacia el inicio de sesión.

### 📍 Geolocalización Resiliente & Mapas Interactivos
- **Cálculo de Distancia Haversine**: Ordenamiento de grupos de estudio y eventos académicos por proximidad física real en kilómetros.
- **Marcadores Vectoriales SVG**: Pines personalizados de alta visibilidad para modo claro y oscuro sobre mapas interactivos basados en *Leaflet* y *OpenStreetMap*.
- **Fallback Inteligente de 3 Etapas**: Si el dispositivo no cuenta con hardware satelital GPS o el servicio del sistema operativo está inactivo, el sistema asigna de forma transparente puntos de referencia del campus sin interrumpir la navegación.
- **Privacidad Total (RN-12)**: Las coordenadas de los usuarios son privadas y se procesan exclusivamente en el cliente para calcular distancias, sin exponerse en los perfiles públicos.

### 🔒 Integridad Criptográfica & Retención de Almacenamiento (LRU)
- **Verificación Anti-Corrupción SHA-256**: Cada archivo adjunto genera un hash criptográfico en el cliente antes de la transferencia, validado byte a byte por el servidor para descartar cargas corruptas.
- **Política de Retención Automática LRU (10 Días)**: Servicio en segundo plano que optimiza el almacenamiento del servidor archivando archivos sin interacción en los últimos 10 días y reactivándolos bajo demanda.
- **Almacenamiento Híbrido**: Soporte transparente para disco local en desarrollo y buckets compatibles con Amazon S3 (**Cloudflare R2**) en entornos de producción.

### 📱 Integración de Sensores de Hardware PWA
- **Cámara Web / Móvil**: Captura fotográfica instantánea de pizarras, apuntes de clase y ejercicios físicos.
- **Grabadora de Audio**: Registro de notas explicativas de voz con reproductor integrado.
- **Vibración Háptica**: Retroalimentación física inmediata en dispositivos compatibles al confirmar capturas o sincronizaciones.
- **Consola de Diagnóstico en Vivo**: Panel interactivo para verificar el estado de permisos y funcionamiento de sensores de hardware.

### 🛡️ Seguridad Web & Auditoría de Nivel Producción
- **Cabeceras HTTP Estrictas (Sesión 22)**: Configuración avanzada de `Content-Security-Policy` (CSP con reporte de violaciones), `HSTS`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y `Permissions-Policy`.
- **Protección contra Fuerza Bruta**: Rate limiting adaptativo en rutas sensibles de autenticación (`/api/v1/auth/*`).
- **Validación Estricta de Correo (RFC 5322)**: Filtro regex estricto en cliente y servidor para garantizar direcciones de correo institucional reales.
- **Consola Administrativa Zero-Footprint**: Módulo de auditoría cargado bajo demanda vía *React.lazy*, con exclusión total de caché en Service Workers y destrucción de memoria al cerrar sesión.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías Utilizadas |
| :--- | :--- |
| **Frontend PWA** | React 18, Vite, Tailwind CSS, Lucide React, Leaflet, Dexie.js (IndexedDB), Service Worker API, Web Push API |
| **Backend REST** | Node.js (v20+), Express, Bcryptjs, JsonWebToken (JWT), Multer, Web-Push (VAPID), Crypto (SHA-256) |
| **Base de Datos** | PostgreSQL 16 (Neon Serverless / Docker Local) con esquema relacional normalizado (15 tablas, UUIDs) |
| **Almacenamiento** | Cloudflare R2 (compatible AWS S3 SDK v3) / Almacenamiento local en disco (`uploads/`) |
| **Infraestructura** | Docker Multi-Arch (Alpine ARM64/AMD64), Docker Compose, Render (`render.yaml`), Vercel (`vercel.json`) |

---

## 📂 Estructura del Proyecto

```text
UniLink/
├── backend/                        # API REST Modular en Node.js + Express
│   ├── src/
│   │   ├── config/                 # DB pool, Cloudflare R2 / S3 client, memoria seed
│   │   ├── middlewares/            # JWT Auth, Roles (isAdmin), Multer, Sanitización XSS
│   │   ├── modules/                # Controladores y rutas (Auth, Posts, Groups, Meetings, etc.)
│   │   └── services/               # Servicio de retención LRU y almacenamiento
│   ├── schema.sql                  # DDL PostgreSQL normalizado (15 tablas con UUID)
│   ├── Dockerfile                  # Imagen backend ligera en Node.js Alpine
│   └── .env.example                # Plantilla de variables de entorno del servidor
├── frontend/                       # Aplicación PWA con React + Vite
│   ├── public/                     # manifest.json, sw.js, iconos PWA e imágenes
│   ├── src/
│   │   ├── admin/                  # Consola de administración y auditoría (Lazy Loaded)
│   │   ├── components/             # Componentes modulares (Navbar, Sidebar, Modales, Mapas)
│   │   ├── context/                # AuthContext (Sesiones Online, Offline y Modo Invitado)
│   │   ├── db/                     # Esquema Dexie.js (versiones 1 y 2 con migración)
│   │   ├── hooks/                  # useOfflineSync, useGeolocation, useAuth
│   │   ├── pages/                  # Feed, Grupos, Encuentros, Mapa, Perfil, Publicar
│   │   └── utils/                  # Formularios Haversine, utilidades SHA-256, auditoría
│   └── vercel.json                 # Configuración de rutas y caché para Vercel
├── scripts/                        # Suites de pruebas E2E, inicializador y auditoría
│   ├── audit_pwa_security.js       # Suite de auditoría PWA y seguridad HTTP (Sesión 22 & 23)
│   ├── init_db.js                  # Inicializador y validador de esquema SQL en PostgreSQL
│   ├── test_api_e2e.js             # Pruebas de integración E2E de endpoints de la API
│   └── test_scale_storage_integrity_e2e.js  # Pruebas de integridad SHA-256, retención y roles
├── docker-compose.yml              # Orquestación local multicontenedor (App + PostgreSQL)
├── render.yaml                     # Manifiesto de infraestructura como código (IaC) para Render
├── package.json                    # Scripts globales de orquestación
└── README.md                       # Documentación principal del proyecto
```

---

## ⚡ Inicio Rápido (Desarrollo Local)

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/UniLink.git
cd UniLink
git checkout develop
```

### 2. Instalar dependencias
Instala simultáneamente las dependencias del monorepositorio, frontend y backend con un solo comando:
```bash
npm run install:all
```

### 3. Configurar variables de entorno
Copia los archivos de ejemplo en sus respectivos directorios:
```bash
cp backend/.env.example backend/.env
```
*(Nota: Si no defines una base de datos PostgreSQL en `DATABASE_URL`, el backend se iniciará automáticamente en modo desacoplado en memoria con datos semilla para facilitar el desarrollo).*

### 4. Ejecutar en modo desarrollo
Inicia el backend (`localhost:5000`) y el frontend (`localhost:5173`) concurrentemente:
```bash
npm run dev
```

---

## 🧪 Pruebas Automatizadas y Auditoría de Calidad

El proyecto cuenta con un conjunto integral de pruebas automatizadas y verificaciones de seguridad:

| Comando | Descripción | Alcance |
| :--- | :--- | :--- |
| `npm run test` | Pruebas de integración E2E de la API | Valida endpoints de autenticación, posts, autoría RN-30, distancia Haversine y Web Push. |
| `npm run audit` | Suite de auditoría de seguridad y PWA | Evalúa 30 criterios: cabeceras HTTP, CSP, HSTS, Rate Limiting, Manifest, Service Worker y comportamiento Offline (**Puntuación: 100% - Grado A+**). |
| `node scripts/test_scale_storage_integrity_e2e.js` | Pruebas de integridad y retención | Valida integridad SHA-256 anti-corrupción, algoritmo LRU de 10 días, validación RFC 5322 y roles Zero-Trust. |
| `npm run build` | Compilación de producción frontend | Verifica la ausencia de errores de tipado o sintaxis generando el bundle optimizado en `frontend/dist/`. |

Para ejecutar todas las pruebas en secuencia:
```bash
npm run test && npm run audit && node scripts/test_scale_storage_integrity_e2e.js
```

---

## 🐳 Despliegue con Docker

El proyecto incluye soporte multi-arquitectura listo para producción:

```bash
# Construir e iniciar contenedores en segundo plano
docker compose up -d --build

# Ver logs de los servicios
docker compose logs -f

# Detener los servicios
docker compose down
```

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **MIT**. Consulta el archivo `package.json` para más detalles.
