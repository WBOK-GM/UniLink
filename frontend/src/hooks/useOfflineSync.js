import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/db';
import { api } from '../api/client';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  // Contar pendientes en IndexedDB
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await db.offline_posts
        .where('sync_status')
        .equals('PENDING')
        .count();
      setPendingCount(count);
    } catch (e) {
      console.warn('Error leyendo Dexie pendingCount:', e);
    }
  }, []);

  // Función principal de sincronización
  const syncOfflinePosts = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    try {
      setIsSyncing(true);
      const pendingPosts = await db.offline_posts
        .where('sync_status')
        .equals('PENDING')
        .toArray();

      if (pendingPosts.length === 0) {
        setIsSyncing(false);
        return;
      }

      let successCount = 0;

      for (const item of pendingPosts) {
        try {
          await db.offline_posts.update(item.local_id, { sync_status: 'SYNCING' });

          const formData = new FormData();
          formData.append('title', item.title);
          formData.append('content', item.content);
          formData.append('category_id', item.category_id);
          if (item.group_id) formData.append('group_id', item.group_id);
          formData.append('post_type', item.post_type);
          if (item.location) formData.append('location', item.location);
          formData.append('client_operation_id', item.client_operation_id);
          formData.append('copyright_declaration_accepted', 'true');

          const response = await api.createPost(formData);

          if (response.success) {
            await db.offline_posts.update(item.local_id, {
              sync_status: 'PUBLISHED',
              synced_at: new Date().toISOString()
            });
            successCount++;
          }
        } catch (postErr) {
          console.error('Error sincronizando post offline:', postErr);
          await db.offline_posts.update(item.local_id, {
            sync_status: 'FAILED',
            last_error: postErr.message,
            retry_count: (item.retry_count || 0) + 1
          });
        }
      }

      await refreshPendingCount();
      setLastSyncResult({
        timestamp: new Date(),
        synced: successCount,
        total: pendingPosts.length
      });

      // Disparar notificación del navegador si está permitido
      if (successCount > 0 && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('✅ Sincronización UniLink Completada', {
          body: `Se publicaron ${successCount} recurso(s) que tenías guardado(s) sin conexión.`,
          icon: '/icons/icon-192x192.png'
        });
      }
    } catch (err) {
      console.error('Error general en syncOfflinePosts:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      console.log('[UniLink Net] Conectividad recuperada. Iniciando sincronización...');
      syncOfflinePosts();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('[UniLink Net] Conexión perdida. Modo Offline activo.');
    };

    // Mensaje desde el Service Worker
    const handleServiceWorkerMessage = (event) => {
      if (event.data && event.data.type === 'TRIGGER_OFFLINE_SYNC') {
        syncOfflinePosts();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [refreshPendingCount, syncOfflinePosts]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncResult,
    syncOfflinePosts,
    refreshPendingCount
  };
}
