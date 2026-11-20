import Dexie from 'dexie';

export class UniLinkDatabase extends Dexie {
  constructor() {
    super('UniLinkPWA_DB');
    this.version(1).stores({
      offline_posts: '++local_id, client_operation_id, sync_status, created_at',
      offline_resources: 'resource_id, file_id, file_name, saved_at, owner_user_id',
      cached_feed: 'id, category_id, created_at'
    });

    // Versión 2: Persistencia Offline de Sesiones y Credenciales Locales PWA
    this.version(2).stores({
      offline_posts: '++local_id, client_operation_id, sync_status, created_at',
      offline_resources: 'resource_id, file_id, file_name, saved_at, owner_user_id',
      cached_feed: 'id, category_id, created_at',
      auth_sessions: 'id, email, token, role, updated_at',
      cached_users: 'email, role, full_name'
    });
  }
}

export const db = new UniLinkDatabase();

/**
 * Guarda una publicación en la cola local de IndexedDB cuando no hay internet
 */
export async function queueOfflinePost(postData) {
  const localRecord = {
    client_operation_id: postData.client_operation_id || crypto.randomUUID(),
    title: postData.title,
    content: postData.content,
    category_id: postData.category_id,
    group_id: postData.group_id || null,
    post_type: postData.post_type || 'RESOURCE',
    location: postData.location || null,
    attachments_meta: postData.attachments_meta || [], // Nombres y tipos
    sync_status: 'PENDING', // PENDING | SYNCING | PUBLISHED | FAILED
    retry_count: 0,
    last_error: null,
    created_at: new Date().toISOString()
  };

  const id = await db.offline_posts.add(localRecord);
  return { ...localRecord, local_id: id };
}

/**
 * Guarda un recurso (documento o apunte) para lectura offline en IndexedDB
 */
export async function saveResourceOffline(resourceId, fileId, fileName, blob, userId) {
  return await db.offline_resources.put({
    resource_id: resourceId,
    file_id: fileId,
    file_name: fileName,
    local_blob: blob,
    saved_at: new Date().toISOString(),
    owner_user_id: userId
  });
}

/**
 * Obtiene los recursos descargados en el dispositivo
 */
export async function getDownloadedResources() {
  return await db.offline_resources.toArray();
}

/**
 * Guarda la sesión de autenticación activa en IndexedDB
 */
export async function saveOfflineSession(sessionData) {
  try {
    return await db.auth_sessions.put({
      id: 'active_session',
      email: sessionData.user?.email || sessionData.email,
      token: sessionData.token,
      role: sessionData.user?.role || 'STUDENT',
      user: sessionData.user,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[UniLink DB] Error guardando sesión en IndexedDB:', err);
  }
}

/**
 * Obtiene la sesión de autenticación activa almacenada en IndexedDB
 */
export async function getOfflineSession() {
  try {
    return await db.auth_sessions.get('active_session');
  } catch (err) {
    console.warn('[UniLink DB] Error leyendo sesión de IndexedDB:', err);
    return null;
  }
}

/**
 * Elimina la sesión de autenticación activa de IndexedDB
 */
export async function clearOfflineSession() {
  try {
    return await db.auth_sessions.delete('active_session');
  } catch (err) {
    console.warn('[UniLink DB] Error limpiando sesión de IndexedDB:', err);
  }
}

/**
 * Precarga el usuario demo oficial en IndexedDB para permitir inicio de sesión offline
 */
export async function seedDefaultOfflineUser() {
  try {
    const demoUser = {
      email: 'estudiante@unilink.edu.co',
      password: '123456',
      role: 'STUDENT',
      full_name: 'Walter Alfonso',
      university: 'Universidad Pedagógica y Tecnológica de Colombia (UPTC)',
      academic_program: 'Ingeniería de Sistemas y Computación',
      semester: 9,
      latitude: 5.5530,
      longitude: -73.3565
    };

    await db.cached_users.put(demoUser);
  } catch (err) {
    console.warn('[UniLink DB] Error sembrando usuario demo en IndexedDB:', err);
  }
}

// Ejecutar siembra inicial en IndexedDB
seedDefaultOfflineUser();
