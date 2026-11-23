const fs = require('fs');
const path = require('path');
const { memoryStore, pool, usePg } = require('../config/db');
const { uploadsDir } = require('../config/storage');

/**
 * Servicio de Retención Inteligente de Almacenamiento (LRU / 10 Días)
 * Gestiona el ciclo de vida de archivos en el servidor central (Oracle Cloud ARM64)
 * para evitar el colapso de almacenamiento con 2.000+ estudiantes activos.
 */

/**
 * Registra un acceso o descarga a un archivo, refrescando su fecha y contador de uso.
 * @param {string} fileId - ID del archivo.
 */
async function recordFileAccess(fileId) {
  if (!fileId) return;

  const file = memoryStore.files.find(f => f.id === fileId);
  if (file) {
    file.last_accessed_at = new Date();
    file.access_count = (file.access_count || 0) + 1;
    if (file.status === 'ARCHIVED') {
      file.status = 'AVAILABLE';
    }
  }

  if (usePg && pool) {
    try {
      await pool.query(
        `UPDATE files 
         SET last_accessed_at = CURRENT_TIMESTAMP, 
             access_count = access_count + 1 
         WHERE id = $1`,
        [fileId]
      );
    } catch (e) {
      console.warn('[StorageRetention] Error actualizando acceso en PG:', e.message);
    }
  }
}

/**
 * Ejecuta la política de retención: archiva binarios no consultados en los últimos N días.
 * Mantiene intactos los metadatos y previsualizaciones para que las publicaciones no se rompan.
 * @param {number} retentionDays - Días de inactividad antes de compactar (default: 10 días).
 * @returns {Promise<object>} Resumen de la operación.
 */
async function cleanExpiredFiles(retentionDays = 10) {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  let archivedCount = 0;
  let bytesFreed = 0;

  for (const file of memoryStore.files) {
    const lastAccess = file.last_accessed_at ? new Date(file.last_accessed_at) : new Date(file.created_at || Date.now());

    // Si el archivo supera el umbral de inactividad y está disponible
    if (lastAccess < cutoffDate && file.status === 'AVAILABLE') {
      file.status = 'ARCHIVED';
      archivedCount++;
      bytesFreed += (file.file_size || 0);

      // Si existe el archivo físico en disco y no es un archivo seed del sistema
      if (file.storage_key && !file.storage_key.startsWith('sample-')) {
        const fullPath = path.join(uploadsDir, file.storage_key);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (err) {
            console.warn(`[StorageRetention] No se pudo desalojar ${file.storage_key}:`, err.message);
          }
        }
      }
    }
  }

  return {
    success: true,
    retentionDays,
    cutoffDate: cutoffDate.toISOString(),
    archivedCount,
    bytesFreed,
    activeFilesCount: memoryStore.files.filter(f => f.status === 'AVAILABLE').length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Obtiene métricas del uso de almacenamiento en el servidor
 */
function getStorageMetrics() {
  const totalFiles = memoryStore.files.length;
  const activeFiles = memoryStore.files.filter(f => f.status === 'AVAILABLE');
  const archivedFiles = memoryStore.files.filter(f => f.status === 'ARCHIVED');

  const totalBytesActive = activeFiles.reduce((acc, f) => acc + (f.file_size || 0), 0);
  const totalBytesArchived = archivedFiles.reduce((acc, f) => acc + (f.file_size || 0), 0);

  return {
    totalFiles,
    activeCount: activeFiles.length,
    archivedCount: archivedFiles.length,
    activeMegabytes: +(totalBytesActive / (1024 * 1024)).toFixed(2),
    archivedMegabytes: +(totalBytesArchived / (1024 * 1024)).toFixed(2),
    policy: 'LRU 10-Day Retention'
  };
}

module.exports = {
  recordFileAccess,
  cleanExpiredFiles,
  getStorageMetrics
};
