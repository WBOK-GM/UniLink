import Dexie from 'dexie';

export class UniLinkDatabase extends Dexie {
  constructor() {
    super('UniLinkPWA_DB');
    this.version(1).stores({
      // 1. OFFLINE_POSTS: Publicaciones creadas sin conexión pendientes de sincronización
      offline_posts: '++local_id, client_operation_id, sync_status, created_at',
      // 2. OFFLINE_RESOURCES: Archivos descargados en local para consulta offline
      offline_resources: 'resource_id, file_id, file_name, saved_at, owner_user_id',
      // 3. CACHED_FEED: Caché local de publicaciones para visualización inmediata offline
      cached_feed: 'id, category_id, created_at'
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
