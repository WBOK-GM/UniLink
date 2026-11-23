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
 * Registra el tag de sincronización en segundo plano con el Service Worker (Background Sync API)
 */
export async function registerBackgroundSync() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register('sync-posts');
      console.log('[UniLink SW] Tag de Background Sync "sync-posts" registrado exitosamente.');
      return true;
    } catch (e) {
      console.warn('[UniLink SW] SyncManager no pudo registrar el tag:', e.message);
      return false;
    }
  }
  return false;
}

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
    attachments: postData.attachments || [],
    sync_status: 'PENDING', // PENDING | SYNCING | PUBLISHED | FAILED
    retry_count: 0,
    last_error: null,
    created_at: new Date().toISOString()
  };

  const id = await db.offline_posts.add(localRecord);
  registerBackgroundSync().catch(() => {});
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

export function canOpenOfflineResource(resource, user) {
  // El visor antiguo usaba "pwa-user" para las copias locales sin asociar una cuenta.
  return !!(user && user.role !== 'GUEST' && (resource?.local_blob || resource?.has_local_copy) &&
    (resource.owner_user_id === user.id || resource.owner_user_id === 'pwa-user'));
}

/**
 * Verifica si un recurso específico está guardado offline
 */
export async function isResourceSavedOffline(resourceId) {
  try {
    const item = await db.offline_resources.get(resourceId);
    return !!item;
  } catch (e) {
    return false;
  }
}

/**
 * Elimina un recurso específico del almacenamiento offline en el dispositivo
 */
export async function deleteResourceOffline(resourceId) {
  try {
    await db.offline_resources.delete(resourceId);
    return true;
  } catch (e) {
    console.warn('[UniLink DB] Error eliminando recurso offline:', e);
    return false;
  }
}

/**
 * Libera todo el almacenamiento offline de archivos descargados
 * (No afecta la sesión ni los posts en cola del usuario)
 */
export async function clearAllOfflineResources() {
  try {
    await db.offline_resources.clear();
    return true;
  } catch (e) {
    console.warn('[UniLink DB] Error liberando almacenamiento offline:', e);
    return false;
  }
}

/**
 * Calcula las métricas de almacenamiento offline en el dispositivo
 */
export async function getOfflineStorageMetrics() {
  try {
    const resources = await db.offline_resources.toArray();
    let totalBytes = 0;
    const items = resources.map(r => {
      const size = r.local_blob ? r.local_blob.size : (r.file_size || 0);
      totalBytes += size;
      return {
        resource_id: r.resource_id,
        file_id: r.file_id,
        file_name: r.file_name,
        owner_user_id: r.owner_user_id,
        has_local_copy: !!r.local_blob,
        size_bytes: size,
        size_kb: +(size / 1024).toFixed(1),
        size_mb: +(size / (1024 * 1024)).toFixed(2),
        saved_at: r.saved_at
      };
    });

    let systemEstimate = null;
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      systemEstimate = {
        quota_mb: +(estimate.quota / (1024 * 1024)).toFixed(1),
        usage_mb: +(estimate.usage / (1024 * 1024)).toFixed(2)
      };
    }

    return {
      fileCount: items.length,
      totalBytes,
      totalMb: +(totalBytes / (1024 * 1024)).toFixed(2),
      items,
      systemEstimate
    };
  } catch (e) {
    console.warn('[UniLink DB] Error obteniendo métricas de almacenamiento:', e);
    return { fileCount: 0, totalBytes: 0, totalMb: 0, items: [], systemEstimate: null };
  }
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
      university: 'Universidad (Campus Tunja)',
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
