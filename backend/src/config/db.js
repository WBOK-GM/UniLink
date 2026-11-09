const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

let pool = null;
let usePg = false;

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
      biography: 'Estudiante apasionado por las PWAs, arquitecturas distribuidas e IA.',
      university: 'Universidad Distrital / Nacional',
      academic_program: 'Ingeniería de Sistemas',
      semester: 9,
      latitude: 4.60971, // Coordenadas privadas
      longitude: -74.08175,
      location_updated_at: new Date(),
      created_at: new Date()
    },
    {
      id: 'p2222222-2222-2222-2222-222222222222',
      user_id: 'u2222222-2222-2222-2222-222222222222',
      full_name: 'Administrador General',
      biography: 'Moderación y gestión de la plataforma comunitaria.',
      university: 'UniLink Staff',
      academic_program: 'Dirección Académica',
      semester: 10,
      latitude: 4.62800,
      longitude: -74.06500,
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
      location: 'Edificio de Ingeniería - Salón 302',
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
      location: 'Biblioteca Central',
      copyright_declaration_accepted: true,
      copyright_policy_version: 'v1.0',
      client_operation_id: 'op-initial-002',
      created_at: new Date(Date.now() - 3600000 * 20)
    }
  ],
  files: [
    {
      id: 'f1',
      uploader_id: 'u1111111-1111-1111-1111-111111111111',
      original_name: 'resumen_pwa_offline.pdf',
      storage_key: 'sample-pwa-guide.pdf',
      mime_type: 'application/pdf',
      file_size: 1024 * 450,
      file_type: 'DOCUMENT',
      status: 'AVAILABLE',
      created_at: new Date()
    }
  ],
  post_files: [
    { id: 'pf1', post_id: 'post-001', file_id: 'f1', display_order: 1 }
  ],
  post_reactions: [
    { id: 'pr1', post_id: 'post-001', user_id: 'u2222222-2222-2222-2222-222222222222', reaction_type: 'LIKE', created_at: new Date() }
  ],
  study_groups: [
    {
      id: 'g-001',
      creator_id: 'u1111111-1111-1111-1111-111111111111',
      category_id: 'c6',
      name: 'Grupo de Estudio PWA & Aplicaciones Móviles',
      description: 'Espacio colaborativo para resolver talleres de Service Workers, IndexedDB y preparar el proyecto final.',
      group_type: 'PUBLIC',
      location_latitude: 4.6099,
      location_longitude: -74.0820,
      max_members: 30,
      status: 'ACTIVE',
      created_at: new Date(Date.now() - 86400000 * 5)
    },
    {
      id: 'g-002',
      creator_id: 'u2222222-2222-2222-2222-222222222222',
      category_id: 'c3',
      name: 'Semillero de Inteligencia Artificial y Agentes',
      description: 'Grupo avanzado para discusión de papers de LLMs, arquitecturas MCP y agentes autónomos. Requiere solicitud previa.',
      group_type: 'PRIVATE',
      location_latitude: 4.6350,
      location_longitude: -74.0835,
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
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.warn('[UniLink DB] No se pudo conectar a PostgreSQL externo. Usando almacén en memoria:', err.message);
      usePg = false;
    } else {
      console.log('[UniLink DB] Conectado exitosamente a PostgreSQL:', res.rows[0].now);
      usePg = true;
    }
  });
} else {
  console.log('[UniLink DB] DATABASE_URL no provista. Operando con almacén en memoria y seed inicial de prueba.');
}

module.exports = {
  pool,
  usePg,
  memoryStore
};
