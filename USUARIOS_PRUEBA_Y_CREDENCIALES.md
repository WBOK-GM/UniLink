# 🎓 UniLink UPTC - Usuarios de Prueba, Credenciales y Matriz de Roles

Este documento detalla las credenciales de prueba preconfiguradas, los perfiles de usuario, los alcances de seguridad y los procedimientos para la evaluación, auditoría y despliegue del sistema **UniLink PWA**.

---

## 📋 Resumen Rápido de Credenciales

| Rol | Correo Electrónico Institucional | Contraseña | Nombre Completo | Programa / Dependencia |
| :--- | :--- | :--- | :--- | :--- |
| **Estudiante** | `estudiante@unilink.edu.co` | `123456` | Walter Alfonso | Ingeniería de Sistemas y Computación (Semestre 9) |
| **Administrador** | `admin@unilink.edu.co` | `123456` | Administrador General | Consola Central de Infraestructura UPTC |

> [!NOTE]
> Las contraseñas en la base de datos PostgreSQL se almacenan hasheadas con **bcrypt** (salt rounds = 10). Para simplificar pruebas académicas y de auditoría se utiliza la clave `123456`.

---

## 👤 1. Perfil Estudiante (`STUDENT`)

### Datos de la Cuenta
- **Email**: `estudiante@unilink.edu.co`
- **Password**: `123456`
- **ID de Usuario**: `u1111111-1111-1111-1111-111111111111`
- **Ubicación de referencia**: Campus Central UPTC Tunja (`5.5530, -73.3565`)

### Capacidades y Alcance en la PWA
- **Feed Académico Offline-First**: Visualización de notas, apuntes, resúmenes y material bibliográfico ordenado por relevancia y temporalidad.
- **Subida con Integridad Criptográfica**: Cada apunte o archivo adjunto genera un hash **SHA-256** en el cliente (`cryptoUtils.js`) verificado byte a byte en el backend para descartar transferencias corruptas.
- **Control Selectivo de Almacenamiento Local**:
  - Casilla `[✓] Guardar para ver sin conexión` en cada publicación.
  - Panel centralizado de gestión (**Administrador de Almacenamiento Local**) con cálculo de MB utilizados y botón de liberación inmediata de memoria.
- **Encuentros y Filtros**: Búsqueda por materias (*Sistemas Distribuidos*, *Bases de Datos Avanzadas*, *Ingeniería de Software*), geolocalización de tutorías y sensores de dispositivo (batería, orientación, estado de red).
- **Aislamiento**: El estudiante **no tiene acceso** a las métricas del servidor ni al código administrativo sensible.

---

## 🛡️ 2. Perfil Administrador (`ADMIN`)

### Datos de la Cuenta
- **Email**: `admin@unilink.edu.co`
- **Password**: `123456`
- **ID de Usuario**: `u2222222-2222-2222-2222-222222222222`

### Capacidades y Alcance en la Consola
- **Acceso On-Demand Zero-Footprint**:
  - La consola administrativa se carga únicamente bajo demanda mediante *dynamic code splitting* (`React.lazy`).
  - El Service Worker (`sw.js`) tiene una regla estricta de exclusión para no almacenar en caché ningún recurso de la consola ni respuestas `/api/v1/security/*`.
  - Al cerrar sesión, el estado y los módulos administrativos se destruyen de la memoria RAM del navegador.
- **Auditoría de Integridad y Almacenamiento**:
  - Visualización del tamaño total de archivos en el servidor (`uploads/`).
  - Total de publicaciones activas y desglose de archivos según su antigüedad.
- **Política de Retención LRU (10 Días)**:
  - Botón de mantenimiento manual y ejecución de purga de archivos huérfanos o con más de 10 días sin interacción de descarga.
- **Seguridad en Rutas**:
  - Middleware `isAdmin` en Express valida la firma criptográfica del JWT (`JWT_SECRET`) y rechaza con `HTTP 403 Forbidden` cualquier intento de un usuario no autorizado.

---

## ✉️ 3. Validación Estricta de Correo Electrónico (RFC 5322)

Para garantizar la integridad de los datos y preparar la plataforma para el futuro módulo de **notificaciones institucionales y recuperación de contraseña por correo**, tanto el frontend como el backend implementan la siguiente regla sintáctica:

```javascript
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
```

### Comportamiento del Sistema:
1. **Frontend (`LoginPage.jsx`)**:
   - Campos de inicio limpios por defecto para uso real en producción.
   - Indicador visual dinámico en tiempo real (`Formato válido` en verde vs `Correo incompleto` en rojo).
   - Bloqueo de envío de formulario si la dirección no cumple el estándar.
2. **Backend (`authController.js`)**:
   - Doble validación en `register` y `login`.
   - Si se envía un correo sin arroba o con dominio incompleto (ej: `usuario@dominio`), el servidor rechaza con `HTTP 400 Bad Request`.
3. **Persistencia en Producción**:
   - Para registrar un nuevo estudiante se exige conectividad directa al servidor central (PostgreSQL) para validar la unicidad del correo (`RN-01`).

---

## 📱 4. Soporte de Autenticación Offline (IndexedDB)

UniLink implementa una estrategia **Offline-First** para escenarios donde el estudiante no dispone de cobertura móvil o Wi-Fi en el campus:

1. **Sesión Inicial Conectado**: Al ingresar exitosamente por primera vez, las credenciales seguras y el perfil se indexan localmente en la base de datos **Dexie.js / IndexedDB** (`cached_users`).
2. **Reingreso Sin Conexión**: Si el estudiante abre la PWA sin internet, el sistema detecta la desconexión, valida contra el almacén local seguro y le permite navegar por los apuntes y archivos previamente descargados sin interrupciones.

---

## 🔮 5. Próximos Pasos: Módulo de Notificaciones

La base de datos y la validación de correos están preparadas para la fase de:
- Envío de tokens temporales de un solo uso (OTP) por SMTP.
- Enlace de recuperación segura de contraseña (`/reset-password?token=...`).
- Notificaciones de nuevos recursos subidos en las asignaturas inscritas.
