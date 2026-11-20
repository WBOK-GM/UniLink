/**
 * Utilidades Criptográficas para UniLink PWA
 * Validación de Integridad de Archivos en Cliente (SHA-256)
 */

/**
 * Calcula el hash SHA-256 de un File o Blob en el navegador usando la API Web Crypto nativa.
 * @param {File|Blob} file - Archivo del que se calculará el hash.
 * @returns {Promise<string>} Cadena hexadecimal del hash SHA-256.
 */
export async function calculateFileSha256(file) {
  if (!file) return null;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.warn('[UniLink Crypto] Error calculando hash SHA-256:', error);
    return null;
  }
}
