# 🎓 UniLink — Plataforma PWA de Colaboración y Comunidad Académica

**UniLink** es una aplicación web progresiva (PWA) de alto rendimiento diseñada para estudiantes universitarios. Centraliza el intercambio de apuntes, documentos y recursos académicos, la creación de grupos de estudio con descubrimiento geolocalizado en mapas, la coordinación de encuentros académicos y una experiencia completa de funcionamiento offline con sincronización en segundo plano.

---

## 🚀 Arquitectura General

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, Leaflet (OpenStreetMap), Dexie.js (IndexedDB), Service Worker (Offline Cache + Push Notifications).
- **Backend:** Node.js, Express, PostgreSQL (Neon / Local), JWT (JsonWebToken), Bcryptjs, Multer (almacenamiento híbrido: Cloudflare R2 o Local Fallback), Web-Push (VAPID).
- **Control de Versiones:** Git con estrategia de ramas `main` y `develop`.

---

## 📂 Estructura del Monorepositorio

```text
UniLink/
├── backend/                # API REST Modular en Node.js + Express
│   ├── src/
│   │   ├── config/         # Conexión DB, Cloudflare R2, Web Push VAPID
│   │   ├── middlewares/    # JWT Auth, Multer, Error Handlers
│   │   └── modules/        # Auth, Users, Categories, Posts, Groups, Meetings, Geo, Reports
│   ├── schema.sql          # DDL PostgreSQL (15 tablas normalizadas con UUID)
│   └── .env.example        # Variables de entorno y credenciales necesarias
├── frontend/               # PWA React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/     # UI limpia y moderna (Cards, AudioPlayer, Map, Modal)
│   │   ├── pages/          # Feed, Grupos, Mapa, Encuentros, Perfil, Cola Offline
│   │   ├── db/             # Dexie.js (OFFLINE_POSTS, OFFLINE_RESOURCES)
│   │   └── hooks/          # useOfflineSync, useGeolocation, useAuth
│   ├── public/             # manifest.json, sw.js, iconos PWA
│   └── .env.example
├── .gitignore
└── package.json            # Orquestación de desarrollo y scripts raíz
```

---

## ⚡ Inicio Rápido (Desarrollo Local)

1. **Instalar dependencias:**
   ```bash
   npm run install:all
   ```

2. **Iniciar Backend y Frontend en paralelo:**
   ```bash
   npm run dev
   ```

* Backend disponible en: `http://localhost:5000`
* Frontend PWA disponible en: `http://localhost:5173`
