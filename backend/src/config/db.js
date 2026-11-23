const path = require('path');
try {
  require('dotenv').config();
} catch (e) {}
try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch (e) {}

const { Pool } = require('pg');
const { v4: uuidv4, v5: uuidv5, validate: isUuid } = require('uuid');

let pool = null;
let usePg = false;
let databaseInitialization;

// Datos en memoria / seed inicial para modo desacoplado (cuando no hay DATABASE_URL configurada)
const memoryStore = {
  users: [
    {
      id: 'u1111111-1111-1111-1111-111111111111',
      email: 'estudiante@unilink.edu.co',
      password_hash: '$2a$10$w8T0mFw2k5eZ9uF1YtXf2eZ4Ue5k6Y7W8Q9E0R1T2Y3U4I5O6P7A', // Pass: 123456
      role: 'STUDENT',
      status: 'ACTIVE',
      created_at: new Date('2026-10-01T10:00:00Z')
    },
    {
      id: 'u2222222-2222-2222-2222-222222222222',
      email: 'admin@unilink.edu.co',
      password_hash: '$2a$10$w8T0mFw2k5eZ9uF1YtXf2eZ4Ue5k6Y7W8Q9E0R1T2Y3U4I5O6P7A',
      role: 'ADMIN',
      status: 'ACTIVE',
      created_at: new Date('2026-10-01T10:00:00Z')
    }
  ],
  profiles: [
    {
      id: 'p1111111-1111-1111-1111-111111111111',
      user_id: 'u1111111-1111-1111-1111-111111111111',
      full_name: 'Walter Alfonso',
      biography: 'Estudiante universitario apasionado por las PWAs, arquitecturas distribuidas e IA.',
      university: 'Universidad (Campus Tunja)',
      academic_program: 'Ingeniería de Sistemas y Computación',
      semester: 9,
      latitude: 5.5530, // Coordenadas privadas Campus Central Tunja
      longitude: -73.3565,
      location_updated_at: new Date(),
      created_at: new Date()
    },
    {
      id: 'p2222222-2222-2222-2222-222222222222',
      user_id: 'u2222222-2222-2222-2222-222222222222',
      full_name: 'Administrador General',
      biography: 'Moderación y gestión de la plataforma comunitaria UniLink.',
      university: 'Equipo de Coordinación UniLink',
      academic_program: 'Dirección Académica',
      semester: 10,
      latitude: 5.5536,
      longitude: -73.3581,
      location_updated_at: new Date(),
      created_at: new Date()
    }
  ],
  categories: [
    { id: 'c1', name: 'Programación', normalized_name: 'programacion', description: 'Algoritmos, estructuras y desarrollo de software', parent_id: null, status: 'ACTIVE' },
    { id: 'c2', name: 'Bases de Datos', normalized_name: 'bases-de-datos', description: 'SQL, NoSQL, modelado y optimización', parent_id: null, status: 'ACTIVE' },
    { id: 'c3', name: 'Inteligencia Artificial', normalized_name: 'inteligencia-artificial', description: 'Machine Learning, Deep Learning, NLP y agentes', parent_id: null, status: 'ACTIVE' },
    { id: 'c4', name: 'Redes y Distribuidos', normalized_name: 'redes-y-distribuidos', description: 'Protocolos, Docker, microservicios y sistemas distribuidos', parent_id: null, status: 'ACTIVE' },
    { id: 'c5', name: 'Matemáticas y Cálculo', normalized_name: 'matematicas-y-calculo', description: 'Álgebra lineal, cálculo diferencial y matemáticas discretas', parent_id: null, status: 'ACTIVE' },
    { id: 'c6', name: 'Desarrollo Web & PWA', normalized_name: 'desarrollo-web-pwa', description: 'Service Workers, React, interfaces y APIs', parent_id: 'c1', status: 'ACTIVE' }
  ],
  category_suggestions: [],
  posts: [
    {
      id: 'post-001',
      author_id: 'u1111111-1111-1111-1111-111111111111',
      category_id: 'c6',
      group_id: null, // Publicación general
      post_type: 'RESOURCE',
      title: 'Guía Completa de Service Workers y Estrategias de Caché PWA',
      content: 'Comparto este resumen detallado con ejemplos de Cache First, Network First y Background Sync con IndexedDB para el proyecto de noveno semestre.',
      status: 'ACTIVE',
      location: 'Facultad de Ingeniería - Salón 302 (Campus Tunja) (5.55250, -73.35530)',
      copyright_declaration_accepted: true,
      copyright_policy_version: 'v1.0',
      client_operation_id: 'op-initial-001',
      created_at: new Date(Date.now() - 3600000 * 4)
    },
    {
      id: 'post-002',
      author_id: 'u2222222-2222-2222-2222-222222222222',
      category_id: 'c4',
      group_id: null,
      post_type: 'RESOURCE',
      title: 'Resumen Taller Docker Compose y Traefik Reverse Proxy',
      content: 'Notas de clase y diagramas de arquitectura para balanceo de carga con contenedores en Linux.',
      status: 'ACTIVE',
      location: 'Biblioteca Central Jorge Palacios Preciado (Campus Tunja) (5.55360, -73.35810)',
      copyright_declaration_accepted: true,
      copyright_policy_version: 'v1.0',
      client_operation_id: 'op-initial-002',
      created_at: new Date(Date.now() - 3600000 * 20)
    },
    {
      id: 'post-003',
      author_id: 'u1111111-1111-1111-1111-111111111111',
      category_id: 'c5',
      group_id: null,
      post_type: 'RESOURCE',
      title: 'Apuntes y Ejercicios Resueltos de Cálculo Diferencial e Integral',
      content: 'Formulario con reglas de derivación, aplicaciones en optimización y teoremas fundamentales del cálculo para preparar el examen parcial.',
      status: 'ACTIVE',
      location: 'Edificio Central - Sala de Estudio (Campus Tunja) (5.55280, -73.35620)',
      copyright_declaration_accepted: true,
      copyright_policy_version: 'v1.0',
      client_operation_id: 'op-initial-003',
      created_at: new Date(Date.now() - 3600000 * 48)
    }
  ],
  files: [
    {
      id: 'f1',
      uploader_id: 'u1111111-1111-1111-1111-111111111111',
      original_name: 'Guia_Service_Workers_Cache_PWA.pdf',
      storage_key: 'sample-pwa-guide.pdf',
      mime_type: 'application/pdf',
      file_size: 4881,
      file_type: 'DOCUMENT',
      checksum: 'sha256:a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      status: 'AVAILABLE',
      access_count: 5,
      last_accessed_at: new Date(),
      created_at: new Date()
    },
    {
      id: 'f2',
      uploader_id: 'u2222222-2222-2222-2222-222222222222',
      original_name: 'Arquitectura_Docker_Traefik.png',
      storage_key: 'sample-docker-traefik.png',
      mime_type: 'image/png',
      file_size: 1024 * 75,
      file_type: 'IMAGE',
      checksum: 'sha256:b2c3d4e5f6a178901234567890abcdef1234567890abcdef1234567890abcdef',
      status: 'AVAILABLE',
      access_count: 8,
      last_accessed_at: new Date(),
      created_at: new Date()
    },
    {
      id: 'f3',
      uploader_id: 'u2222222-2222-2222-2222-222222222222',
      original_name: 'Guia_Despliegue_Docker_Compose.pdf',
      storage_key: 'sample-docker-guia.pdf',
      mime_type: 'application/pdf',
      file_size: 2365,
      file_type: 'DOCUMENT',
      checksum: 'sha256:c3d4e5f6a1b278901234567890abcdef1234567890abcdef1234567890abcdef',
      status: 'AVAILABLE',
      access_count: 3,
      last_accessed_at: new Date(),
      created_at: new Date()
    },
    {
      id: 'f4',
      uploader_id: 'u1111111-1111-1111-1111-111111111111',
      original_name: 'Apuntes_Calculo_Diferencial.pdf',
      storage_key: 'sample-calculo-apuntes.pdf',
      mime_type: 'application/pdf',
      file_size: 2248,
      file_type: 'DOCUMENT',
      checksum: 'sha256:d4e5f6a1b2c378901234567890abcdef1234567890abcdef1234567890abcdef',
      status: 'AVAILABLE',
      access_count: 12,
      last_accessed_at: new Date(),
      created_at: new Date()
    }
  ],
  post_files: [
    { id: 'pf1', post_id: 'post-001', file_id: 'f1', display_order: 1 },
    { id: 'pf2', post_id: 'post-002', file_id: 'f2', display_order: 1 },
    { id: 'pf3', post_id: 'post-002', file_id: 'f3', display_order: 2 },
    { id: 'pf4', post_id: 'post-003', file_id: 'f4', display_order: 1 }
  ],
  post_reactions: [
    { id: 'pr1', post_id: 'post-001', user_id: 'u2222222-2222-2222-2222-222222222222', reaction_type: 'LIKE', created_at: new Date() }
  ],
  post_ratings: [],
  study_groups: [
    {
      id: 'g-001',
      creator_id: 'u1111111-1111-1111-1111-111111111111',
      category_id: 'c6',
      name: 'Grupo de Estudio PWA & Aplicaciones Móviles',
      description: 'Espacio colaborativo para resolver talleres de Service Workers, IndexedDB y preparar el proyecto final en la Facultad de Ingeniería.',
      group_type: 'PUBLIC',
      location_latitude: 5.5525, // Facultad de Ingeniería Campus Tunja
      location_longitude: -73.3553,
      max_members: 30,
      status: 'ACTIVE',
      created_at: new Date(Date.now() - 86400000 * 5)
    },
    {
      id: 'g-002',
      creator_id: 'u2222222-2222-2222-2222-222222222222',
      category_id: 'c3',
      name: 'Semillero de Inteligencia Artificial y Agentes',
      description: 'Grupo avanzado en Biblioteca Central para discusión de papers de LLMs, arquitecturas MCP y agentes autónomos. Requiere solicitud previa.',
      group_type: 'PRIVATE',
      location_latitude: 5.5536, // Biblioteca Central Campus Tunja
      location_longitude: -73.3581,
      max_members: 15,
      status: 'ACTIVE',
      created_at: new Date(Date.now() - 86400000 * 10)
    }
  ],
  group_members: [
    { id: 'gm1', group_id: 'g-001', user_id: 'u1111111-1111-1111-1111-111111111111', member_role: 'OWNER', membership_status: 'ACTIVE', joined_at: new Date() },
    { id: 'gm2', group_id: 'g-002', user_id: 'u2222222-2222-2222-2222-222222222222', member_role: 'OWNER', membership_status: 'ACTIVE', joined_at: new Date() }
  ],
  group_meetings: [
    {
      id: 'm-001',
      group_id: 'g-001',
      creator_id: 'u1111111-1111-1111-1111-111111111111',
      title: 'Sesión de Programación en Parejas: IndexedDB y Dexie',
      description: 'Revisión técnica de la sincronización offline y resolución de dudas antes de la entrega.',
      start_datetime: new Date(Date.now() + 86400000 * 2),
      end_datetime: new Date(Date.now() + 86400000 * 2 + 7200000),
      meeting_mode: 'HYBRID',
      location: 'Laboratorio de Software 4B',
      meeting_link: 'https://meet.google.com/uni-link-demo',
      max_attendees: 20,
      status: 'SCHEDULED',
      created_at: new Date()
    }
  ],
  meeting_attendees: [
    { id: 'ma1', meeting_id: 'm-001', user_id: 'u1111111-1111-1111-1111-111111111111', attendance_status: 'CONFIRMED', responded_at: new Date() }
  ],
  group_tasks: [
    {
      id: 'gt-001',
      group_id: 'g-001',
      creator_id: 'u1111111-1111-1111-1111-111111111111',
      title: 'Implementar Service Worker y Cache Storage PWA',
      description: 'Estrategia network-first con fallback a caché y precaching de assets.',
      assigned_to: 'u1111111-1111-1111-1111-111111111111',
      status: 'DONE',
      due_date: new Date(Date.now() + 86400000 * 3),
      created_at: new Date()
    },
    {
      id: 'gt-002',
      group_id: 'g-001',
      creator_id: 'u1111111-1111-1111-1111-111111111111',
      title: 'Configurar sincronización en segundo plano con IndexedDB',
      description: 'Cola de publicaciones locales con cola Dexie.',
      assigned_to: 'u1111111-1111-1111-1111-111111111111',
      status: 'IN_PROGRESS',
      due_date: new Date(Date.now() + 86400000 * 5),
      created_at: new Date()
    },
    {
      id: 'gt-003',
      group_id: 'g-001',
      creator_id: 'u1111111-1111-1111-1111-111111111111',
      title: 'Preparar diapositivas de sustentación de proyecto',
      description: 'Documentar arquitectura offline-first y seguridad CSP.',
      assigned_to: null,
      status: 'TODO',
      due_date: new Date(Date.now() + 86400000 * 7),
      created_at: new Date()
    }
  ],
  notifications: [
    {
      id: 'n1',
      user_id: 'u1111111-1111-1111-1111-111111111111',
      notification_type: 'WELCOME',
      title: '¡Bienvenido a UniLink!',
      message: 'Explora recursos, descubre grupos en el mapa y prueba la experiencia offline.',
      reference_type: 'SYSTEM',
      reference_id: null,
      is_read: false,
      created_at: new Date()
    }
  ],
  push_subscriptions: [],
  reports: []
};

// Inicialización de conexión PostgreSQL si existe DATABASE_URL
if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
  const isNeonOrSsl = process.env.DATABASE_URL.includes('sslmode=require') ||
    process.env.DATABASE_URL.includes('neon.tech') ||
    process.env.DATABASE_URL.includes('render.com') ||
    process.env.NODE_ENV === 'production';

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isNeonOrSsl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });
}

/**
 * Hidrata el almacén en memoria (memoryStore) con todos los registros persistentes
 * guardados en la base de datos PostgreSQL Neon, garantizando tolerancia ante
 * suspensiones o reinicios de instancias en Render (Free Tier).
 */
async function hydrateMemoryStoreFromPg() {
  if (!pool) return;
  try {
    // 1. Usuarios
    const usersRes = await pool.query('SELECT * FROM users');
    if (usersRes.rows && usersRes.rows.length > 0) {
      const pgUsers = usersRes.rows.map(u => ({
        id: u.id,
        email: u.email,
        password_hash: u.password_hash,
        role: u.role,
        status: u.status,
        created_at: new Date(u.created_at),
        updated_at: new Date(u.updated_at || u.created_at)
      }));
      // Preservar usuarios demo en memoria si no estuvieran en PG
      for (const pu of pgUsers) {
        const idx = memoryStore.users.findIndex(u => u.id === pu.id || u.email.toLowerCase() === pu.email.toLowerCase());
        if (idx >= 0) {
          memoryStore.users[idx] = pu;
        } else {
          memoryStore.users.push(pu);
        }
      }
    }

    // 2. Perfiles
    const profilesRes = await pool.query('SELECT * FROM profiles');
    if (profilesRes.rows && profilesRes.rows.length > 0) {
      const pgProfiles = profilesRes.rows.map(p => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        biography: p.biography || '',
        avatar_file_id: p.avatar_file_id || null,
        university: p.university || 'Universidad',
        academic_program: p.academic_program || 'Ingeniería de Sistemas',
        semester: Number(p.semester) || 1,
        latitude: Number(p.latitude) || 5.5530,
        longitude: Number(p.longitude) || -73.3565,
        location_updated_at: new Date(p.location_updated_at || p.created_at),
        created_at: new Date(p.created_at),
        updated_at: new Date(p.updated_at || p.created_at)
      }));
      for (const pp of pgProfiles) {
        const idx = memoryStore.profiles.findIndex(p => p.id === pp.id || p.user_id === pp.user_id);
        if (idx >= 0) {
          memoryStore.profiles[idx] = pp;
        } else {
          memoryStore.profiles.push(pp);
        }
      }
    }

    // 3. Categorías
    const catRes = await pool.query('SELECT * FROM categories');
    if (catRes.rows && catRes.rows.length > 0) {
      for (const pc of catRes.rows) {
        const idx = memoryStore.categories.findIndex(c => c.id === pc.id);
        const catObj = {
          id: pc.id,
          name: pc.name,
          normalized_name: pc.normalized_name,
          description: pc.description || '',
          parent_id: pc.parent_id || null,
          status: pc.status || 'ACTIVE'
        };
        if (idx >= 0) {
          memoryStore.categories[idx] = catObj;
        } else {
          memoryStore.categories.push(catObj);
        }
      }
    }

    // 4. Propuestas de categorías
    const sugRes = await pool.query('SELECT * FROM category_suggestions');
    if (sugRes.rows && sugRes.rows.length > 0) {
      memoryStore.category_suggestions = sugRes.rows.map(s => ({
        id: s.id,
        user_id: s.user_id,
        name: s.name,
        normalized_name: s.normalized_name,
        parent_id: s.parent_id || null,
        status: s.status || 'PENDING',
        reviewed_by: s.reviewed_by || null,
        created_at: new Date(s.created_at)
      }));
    }

    // 5. Grupos de estudio
    const groupsRes = await pool.query('SELECT * FROM study_groups');
    if (groupsRes.rows && groupsRes.rows.length > 0) {
      for (const g of groupsRes.rows) {
        const idx = memoryStore.study_groups.findIndex(sg => sg.id === g.id);
        const gObj = {
          id: g.id,
          creator_id: g.creator_id,
          category_id: g.category_id,
          name: g.name,
          description: g.description || '',
          group_type: g.group_type || 'PUBLIC',
          location_latitude: Number(g.location_latitude),
          location_longitude: Number(g.location_longitude),
          max_members: Number(g.max_members) || 50,
          status: g.status || 'ACTIVE',
          created_at: new Date(g.created_at),
          updated_at: new Date(g.updated_at || g.created_at)
        };
        if (idx >= 0) memoryStore.study_groups[idx] = gObj;
        else memoryStore.study_groups.push(gObj);
      }
    }

    // 6. Miembros de grupos
    const membersRes = await pool.query('SELECT * FROM group_members');
    if (membersRes.rows && membersRes.rows.length > 0) {
      for (const m of membersRes.rows) {
        const idx = memoryStore.group_members.findIndex(gm => gm.id === m.id || (gm.group_id === m.group_id && gm.user_id === m.user_id));
        const mObj = {
          id: m.id,
          group_id: m.group_id,
          user_id: m.user_id,
          member_role: m.member_role || 'MEMBER',
          membership_status: m.membership_status || 'ACTIVE',
          joined_at: new Date(m.joined_at || Date.now())
        };
        if (idx >= 0) memoryStore.group_members[idx] = mObj;
        else memoryStore.group_members.push(mObj);
      }
    }

    // 8. Reacciones
    const reactionsRes = await pool.query('SELECT * FROM post_reactions');
    if (reactionsRes.rows && reactionsRes.rows.length > 0) {
      for (const r of reactionsRes.rows) {
        const idx = memoryStore.post_reactions.findIndex(mr => mr.id === r.id || (mr.post_id === r.post_id && mr.user_id === r.user_id));
        const rObj = {
          id: r.id,
          post_id: r.post_id,
          user_id: r.user_id,
          reaction_type: r.reaction_type,
          created_at: new Date(r.created_at),
          updated_at: new Date(r.updated_at || r.created_at)
        };
        if (idx >= 0) memoryStore.post_reactions[idx] = rObj;
        else memoryStore.post_reactions.push(rObj);
      }
    }

    // 8b. Calificaciones en estrellas (1-5)
    try {
      const ratingsRes = await pool.query('SELECT * FROM post_ratings');
      for (const r of ratingsRes.rows) {
        const idx = memoryStore.post_ratings.findIndex(mr => mr.post_id === r.post_id && mr.user_id === r.user_id);
        const ratingObj = {
          id: r.id,
          post_id: r.post_id,
          user_id: r.user_id,
          rating: Number(r.rating),
          created_at: new Date(r.created_at),
          updated_at: new Date(r.updated_at || r.created_at)
        };
        if (idx >= 0) memoryStore.post_ratings[idx] = ratingObj;
        else memoryStore.post_ratings.push(ratingObj);
      }
    } catch (err) {
      console.warn('[UniLink DB] No se pudieron cargar las calificaciones:', err.message);
    }

    // 9. Encuentros
    const meetingsRes = await pool.query('SELECT * FROM group_meetings');
    if (meetingsRes.rows && meetingsRes.rows.length > 0) {
      for (const gm of meetingsRes.rows) {
        const idx = memoryStore.group_meetings.findIndex(m => m.id === gm.id);
        const gmObj = {
          id: gm.id,
          group_id: gm.group_id,
          creator_id: gm.creator_id,
          title: gm.title,
          description: gm.description || '',
          start_datetime: new Date(gm.start_datetime),
          end_datetime: gm.end_datetime ? new Date(gm.end_datetime) : null,
          meeting_mode: gm.meeting_mode || 'IN_PERSON',
          location: gm.location || null,
          meeting_link: gm.meeting_link || null,
          max_attendees: gm.max_attendees ? Number(gm.max_attendees) : null,
          status: gm.status || 'SCHEDULED',
          created_at: new Date(gm.created_at)
        };
        if (idx >= 0) memoryStore.group_meetings[idx] = gmObj;
        else memoryStore.group_meetings.push(gmObj);
      }
    }

    // 10. Asistentes a encuentros
    const attendeesRes = await pool.query('SELECT * FROM meeting_attendees');
    if (attendeesRes.rows && attendeesRes.rows.length > 0) {
      for (const a of attendeesRes.rows) {
        const idx = memoryStore.meeting_attendees.findIndex(ma => ma.id === a.id || (ma.meeting_id === a.meeting_id && ma.user_id === a.user_id));
        const aObj = {
          id: a.id,
          meeting_id: a.meeting_id,
          user_id: a.user_id,
          attendance_status: a.attendance_status || 'CONFIRMED',
          responded_at: new Date(a.responded_at || Date.now())
        };
        if (idx >= 0) memoryStore.meeting_attendees[idx] = aObj;
        else memoryStore.meeting_attendees.push(aObj);
      }
    }

    // 11. Reportes
    const reportsRes = await pool.query('SELECT * FROM reports');
    if (reportsRes.rows && reportsRes.rows.length > 0) {
      for (const rp of reportsRes.rows) {
        const idx = memoryStore.reports.findIndex(mr => mr.id === rp.id);
        const rpObj = {
          id: rp.id,
          reporter_id: rp.reporter_id,
          post_id: rp.post_id,
          reason: rp.reason,
          description: rp.description || '',
          status: rp.status || 'PENDING',
          resolution: rp.resolution || null,
          reviewed_by: rp.reviewed_by || null,
          created_at: new Date(rp.created_at),
          reviewed_at: rp.reviewed_at ? new Date(rp.reviewed_at) : null
        };
        if (idx >= 0) memoryStore.reports[idx] = rpObj;
        else memoryStore.reports.push(rpObj);
      }
    }

    console.log(`[UniLink DB] Sincronización exitosa: ${memoryStore.users.length} usuarios, ${memoryStore.posts.length} posts y ${memoryStore.study_groups.length} grupos en memoria.`);
  } catch (err) {
    console.warn('[UniLink DB] Error hidratando memoria desde PostgreSQL:', err.message);
  }
}

/**
 * Inicialización completa de la base de datos
 */
async function ensurePostRatingsTable() {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_ratings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_post_user_rating UNIQUE (post_id, user_id)
      )
    `);
  } catch (err) {
    console.warn('[UniLink DB] No se pudo asegurar la tabla post_ratings:', err.message);
  }
}

async function initPushSubscriptions() {
  try {
    let subscriptions;
    try {
      ({ rows: subscriptions } = await pool.query('SELECT * FROM push_subscriptions'));
    } catch (err) {
      if (err.code !== '42P01') throw err;
      await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
      `);
      ({ rows: subscriptions } = await pool.query('SELECT * FROM push_subscriptions'));
    }
    for (const subscription of subscriptions) {
      const record = { ...subscription, created_at: new Date(subscription.created_at) };
      const index = memoryStore.push_subscriptions.findIndex(s => s.endpoint === record.endpoint);
      if (index >= 0) memoryStore.push_subscriptions[index] = record;
      else memoryStore.push_subscriptions.push(record);
    }
  } catch (err) {
    console.warn('[UniLink DB] No se pudieron recuperar las suscripciones push:', err.message);
  }
}

function initDatabase() {
  if (!databaseInitialization) {
    databaseInitialization = connectDatabase().finally(() => {
      databaseInitialization = undefined;
    });
  }
  return databaseInitialization;
}

async function connectDatabase() {
  if (!pool) {
    console.log('[UniLink DB] DATABASE_URL no provista. Operando con almacén en memoria y seed inicial de prueba.');
    usePg = false;
    return false;
  }

  try {
    const res = await pool.query('SELECT NOW()');
    console.log('[UniLink DB] Conectado exitosamente a PostgreSQL (Neon):', res.rows[0].now);
    usePg = true;
    await updatePostSchema().catch(error => {
      console.warn('[UniLink DB] No se pudo actualizar el esquema de publicaciones:', error.message);
    });
    await ensurePostRatingsTable();
    await hydrateMemoryStoreFromPg();
    await hydratePostsFromPg();
    await initPushSubscriptions();
    return true;
  } catch (err) {
    console.warn('[UniLink DB] No se pudo conectar a PostgreSQL externo. Usando almacén en memoria:', err.message);
    usePg = false;
    return false;
  }
}

async function hydratePostsFromPg() {
  try {
    const postsRes = await pool.query('SELECT * FROM posts');
    if (postsRes.rows && postsRes.rows.length > 0) {
      for (const p of postsRes.rows) {
        const idx = memoryStore.posts.findIndex(mp => mp.id === p.id);
        const pObj = {
          id: p.id,
          author_id: p.author_id,
          category_id: p.category_id,
          group_id: p.source_group_id || p.group_id || null,
          post_type: p.post_type || 'RESOURCE',
          title: p.title,
          content: p.content,
          location: p.location || '',
          status: p.status || 'ACTIVE',
          copyright_declaration_accepted: p.copyright_declaration_accepted !== false,
          copyright_policy_version: p.copyright_policy_version || 'v1.0',
          client_operation_id: p.client_operation_id || null,
          created_at: new Date(p.created_at),
          updated_at: new Date(p.updated_at || p.created_at)
        };
        if (idx >= 0) memoryStore.posts[idx] = pObj;
        else memoryStore.posts.push(pObj);
      }
    }

    const filesRes = await pool.query('SELECT * FROM files');
    for (const file of filesRes.rows) {
      const index = memoryStore.files.findIndex(item => item.id === file.id);
      const record = { ...file, file_size: Number(file.file_size) };
      if (index >= 0) memoryStore.files[index] = record;
      else memoryStore.files.push(record);
    }

    const linksRes = await pool.query('SELECT * FROM post_files ORDER BY display_order');
    for (const link of linksRes.rows) {
      const index = memoryStore.post_files.findIndex(item => item.id === link.id);
      if (index >= 0) memoryStore.post_files[index] = link;
      else memoryStore.post_files.push(link);
    }

  } catch (error) {
    console.warn('[UniLink DB] No se pudieron recuperar las publicaciones:', error.message);
  }
}

async function updatePostSchema() {
  const { rows } = await pool.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'posts'
  `);
  if (!rows.length) return;
  if (!rows.some(column => column.column_name === 'source_group_id')) {
    await pool.query('ALTER TABLE posts ADD COLUMN IF NOT EXISTS source_group_id TEXT');
  }
  if (rows.some(column => column.column_name === 'client_operation_id' && column.data_type === 'uuid')) {
    await pool.query('ALTER TABLE posts ALTER COLUMN client_operation_id TYPE TEXT USING client_operation_id::text');
  }
}

async function persistPostCategory(client, category) {
  const id = isUuid(category.id) ? category.id : uuidv5(`unilink:category:${category.id}`, uuidv5.URL);
  const parent = memoryStore.categories.find(item => item.id === category.parent_id);
  const parentId = parent ? await persistPostCategory(client, parent) : null;
  if (!isUuid(category.id)) {
    const { rows } = await client.query(
      'SELECT id FROM categories WHERE normalized_name = $1 AND parent_id IS NOT DISTINCT FROM $2 LIMIT 1',
      [category.normalized_name, parentId]
    );
    if (rows.length) return rows[0].id;
  }
  await client.query(
    `INSERT INTO categories (id, name, normalized_name, description, parent_id, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [id, category.name, category.normalized_name, category.description, parentId, category.status]
  );
  return id;
}

async function persistPost(post, files, links, category) {
  const client = await pool.connect();
  let commitStarted = false;
  try {
    await client.query('BEGIN');
    const categoryId = await persistPostCategory(client, category);
    // Los grupos que solo existen en memoria mantienen su identificador y nunca se vuelven publicaciones generales.
    const group = isUuid(post.group_id)
      ? await client.query('SELECT id FROM study_groups WHERE id = $1', [post.group_id])
      : null;
    const groupId = group?.rows[0]?.id || null;
    const created = await client.query(
      `INSERT INTO posts (
        id, author_id, category_id, group_id, source_group_id, post_type, title, content, status, location,
        copyright_declaration_accepted, copyright_policy_version, client_operation_id, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (client_operation_id) DO NOTHING RETURNING id`,
      [post.id, post.author_id, categoryId, groupId, groupId ? null : post.group_id, post.post_type,
        post.title, post.content, post.status, post.location, post.copyright_declaration_accepted,
        post.copyright_policy_version, post.client_operation_id, post.created_at, post.updated_at]
    );
    if (!created.rowCount) {
      const existing = await client.query('SELECT * FROM posts WHERE client_operation_id = $1', [post.client_operation_id]);
      await client.query('ROLLBACK');
      return existing.rows[0];
    }

    for (const file of files) {
      await client.query(
        `INSERT INTO files (id, uploader_id, original_name, storage_key, mime_type, file_size, file_type, checksum, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [file.id, file.uploader_id, file.original_name, file.storage_key, file.mime_type, file.file_size,
          file.file_type, file.checksum, file.status, file.created_at]
      );
    }
    for (const link of links) {
      await client.query(
        'INSERT INTO post_files (id, post_id, file_id, display_order) VALUES ($1, $2, $3, $4)',
        [link.id, link.post_id, link.file_id, link.display_order]
      );
    }
    commitStarted = true;
    await client.query('COMMIT');
    return null;
  } catch (error) {
    if (commitStarted) {
      // Si se perdió la conexión al confirmar, la publicación puede referenciar los adjuntos.
      error.preserveAttachments = true;
    }
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function updatePostStatus(post, status) {
  const updatedAt = new Date();
  if (pool && isUuid(post.id)) {
    await pool.query('UPDATE posts SET status = $1, updated_at = $2 WHERE id = $3', [status, updatedAt, post.id]);
  }
  post.status = status;
  post.updated_at = updatedAt;
}

/**
 * Persiste un usuario y perfil en PostgreSQL Neon con control de unicidad.
 */
async function persistUser(user, profile) {
  if (!pool) return false;
  try {
    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, user.email, user.password_hash, user.role, user.status, user.created_at, user.updated_at]
    );

    await pool.query(
      `INSERT INTO profiles (id, user_id, full_name, biography, university, academic_program, semester, latitude, longitude, location_updated_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        profile.id,
        user.id,
        profile.full_name,
        profile.biography || '',
        profile.university || 'Universidad',
        profile.academic_program || 'Ingeniería de Sistemas',
        Number(profile.semester) || 1,
        Number(profile.latitude) || 5.5530,
        Number(profile.longitude) || -73.3565,
        profile.location_updated_at || new Date(),
        profile.created_at || new Date(),
        profile.updated_at || new Date()
      ]
    );
    return true;
  } catch (err) {
    if (err.code === '23505') {
      const error = new Error('El correo electrónico ya se encuentra registrado.');
      error.code = 'DUPLICATE_EMAIL';
      throw error;
    }
    console.warn('[UniLink DB] Error persistiendo usuario en PostgreSQL:', err.message);
    throw err;
  }
}

/**
 * Consulta un usuario por correo electrónico directamente en PostgreSQL
 */
async function queryUserByEmail(email) {
  if (!pool) return null;
  try {
    const normalized = email.toLowerCase().trim();
    const res = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.role, u.status, u.created_at, u.updated_at,
              p.id as profile_id, p.full_name, p.biography, p.university, p.academic_program,
              p.semester, p.latitude, p.longitude
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [normalized]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const user = {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      role: row.role,
      status: row.status,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at || row.created_at)
    };

    const profile = {
      id: row.profile_id,
      user_id: row.id,
      full_name: row.full_name,
      biography: row.biography || '',
      university: row.university || 'Universidad',
      academic_program: row.academic_program || 'Ingeniería de Sistemas',
      semester: Number(row.semester) || 1,
      latitude: Number(row.latitude) || 5.5530,
      longitude: Number(row.longitude) || -73.3565
    };

    // Actualizar memoryStore local
    const uIdx = memoryStore.users.findIndex(u => u.id === user.id || u.email.toLowerCase() === normalized);
    if (uIdx >= 0) memoryStore.users[uIdx] = user;
    else memoryStore.users.push(user);

    const pIdx = memoryStore.profiles.findIndex(p => p.user_id === user.id);
    if (pIdx >= 0) memoryStore.profiles[pIdx] = profile;
    else memoryStore.profiles.push(profile);

    return { user, profile };
  } catch (err) {
    console.warn('[UniLink DB] Error consultando usuario por correo en PostgreSQL:', err.message);
    return null;
  }
}

/**
 * Persiste (inserta o actualiza) una suscripción Web Push en PostgreSQL.
 * El endpoint es único por dispositivo, por lo que se usa ON CONFLICT para evitar duplicados.
 */
async function persistPushSubscription(sub) {
  if (!pool) return false;
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (endpoint) DO UPDATE
         SET id = EXCLUDED.id,
             user_id = EXCLUDED.user_id,
             p256dh = EXCLUDED.p256dh,
             auth = EXCLUDED.auth,
             created_at = EXCLUDED.created_at`,
      [sub.id, sub.user_id, sub.endpoint, sub.p256dh, sub.auth, sub.created_at || new Date()]
    );
    return true;
  } catch (err) {
    console.warn('[UniLink DB] Error persistiendo suscripción push en PostgreSQL:', err.message);
    return false;
  }
}

/**
 * Persiste (inserta o actualiza) la calificación de un usuario para una publicación.
 */
async function persistPostRating(record) {
  if (!pool) return false;
  try {
    await pool.query(
      `INSERT INTO post_ratings (id, post_id, user_id, rating, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (post_id, user_id) DO UPDATE
         SET rating = EXCLUDED.rating,
             updated_at = EXCLUDED.updated_at`,
      [record.id, record.post_id, record.user_id, record.rating, record.created_at, record.updated_at]
    );
    return true;
  } catch (err) {
    console.warn('[UniLink DB] Error persistiendo calificación en PostgreSQL:', err.message);
    return false;
  }
}

/**
 * Elimina la calificación de un usuario para una publicación.
 */
async function deletePostRating(postId, userId) {
  if (!pool) return false;
  try {
    await pool.query('DELETE FROM post_ratings WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    return true;
  } catch (err) {
    console.warn('[UniLink DB] Error eliminando calificación en PostgreSQL:', err.message);
    return false;
  }
}

/**
 * Elimina una suscripción Web Push expirada (410 Gone / 404 Not Found).
 */
async function deletePushSubscription(id) {
  if (!pool) return false;
  try {
    await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [id]);
    return true;
  } catch (err) {
    console.warn('[UniLink DB] Error eliminando suscripción push en PostgreSQL:', err.message);
    return false;
  }
}

// Iniciar en segundo plano sin bloquear importación
if (pool) {
  initDatabase().catch(e => console.warn('[UniLink DB] Init diferido:', e.message));
}

module.exports = {
  pool,
  get usePg() { return usePg; },
  memoryStore,
  initDatabase,
  hydrateMemoryStoreFromPg,
  persistPost,
  updatePostStatus,
  persistUser,
  queryUserByEmail,
  persistPostRating,
  deletePostRating,
  persistPushSubscription,
  deletePushSubscription
};
