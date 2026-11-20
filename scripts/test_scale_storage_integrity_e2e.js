/**
 * Suite de Pruebas Automatizadas E2E:
 * Escalabilidad, Integridad Criptográfica SHA-256, Política de Retención 10 Días y Separación de Roles
 * UniLink PWA - Noveno Semestre
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

let app;
let server;
const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let passedCount = 0;
let failedCount = 0;

function reportTest(name, passed, detail = '') {
  if (passed) {
    passedCount++;
    console.log(`  ✅ [PASS] ${name}${detail ? ' -> ' + detail : ''}`);
  } else {
    failedCount++;
    console.error(`  ❌ [FAIL] ${name}${detail ? ' -> ' + detail : ''}`);
  }
}

async function runTests() {
  console.log('====================================================================');
  console.log('🧪 Iniciando Pruebas E2E: Integridad SHA-256, Retención y Roles');
  console.log('====================================================================\n');

  try {
    app = require('../backend/src/app');
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`📡 Servidor de pruebas activo en ${BASE_URL}\n`);

    // 1. Obtener Token de Estudiante y Token de Admin
    console.log('--- 1. Autenticación y Emisión de Tokens JWT por Roles ---');
    const studentLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'estudiante@unilink.edu.co', password: '123456' })
    });
    const studentLoginData = await studentLoginRes.json();
    const studentToken = studentLoginData.token;
    reportTest('Login Estudiante exitoso con JWT', studentLoginData.success && studentLoginData.user.role === 'STUDENT');

    const adminLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@unilink.edu.co', password: '123456' })
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.token;
    reportTest('Login Administrador exitoso con rol ADMIN', adminLoginData.success && adminLoginData.user.role === 'ADMIN');

    // 2. Registro Centralizado con Validación de Unicidad
    console.log('\n--- 2. Registro Centralizado en Base de Datos ---');
    const duplicateRegisterRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'estudiante@unilink.edu.co',
        password: 'password123',
        full_name: 'Intento Duplicado'
      })
    });
    reportTest('RN-01: Rechazo de correo duplicado en base de datos central', duplicateRegisterRes.status === 409);

    // 3. Verificación de Integridad Criptográfica Anti-Corrupción (SHA-256)
    console.log('\n--- 3. Verificación de Integridad SHA-256 Anti-Corrupción ---');
    
    // Crear archivo de prueba
    const tempTestFile = path.join(__dirname, 'test_apunte_pwa.txt');
    const fileContent = 'Contenido verificado de apuntes sobre Service Workers, IndexedDB y Arquitecturas PWA UPTC 2026.';
    fs.writeFileSync(tempTestFile, fileContent, 'utf8');
    const validSha256 = crypto.createHash('sha256').update(fs.readFileSync(tempTestFile)).digest('hex');

    // 3.1 Subida con Hash Válido
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let validMultipart = `--${boundary}\r\n`;
    validMultipart += 'Content-Disposition: form-data; name="title"\r\n\r\nApuntes Sistemas Distribuidos 2026\r\n';
    validMultipart += `--${boundary}\r\n`;
    validMultipart += 'Content-Disposition: form-data; name="content"\r\n\r\nResumen con verificación criptográfica de integridad.\r\n';
    validMultipart += `--${boundary}\r\n`;
    validMultipart += 'Content-Disposition: form-data; name="category_id"\r\n\r\nc1\r\n';
    validMultipart += `--${boundary}\r\n`;
    validMultipart += 'Content-Disposition: form-data; name="copyright_declaration_accepted"\r\n\r\ntrue\r\n';
    validMultipart += `--${boundary}\r\n`;
    validMultipart += 'Content-Disposition: form-data; name="file_checksum_0"\r\n\r\n' + validSha256 + '\r\n';
    validMultipart += `--${boundary}\r\n`;
    validMultipart += 'Content-Disposition: form-data; name="attachments"; filename="apuntes_distribuidos.txt"\r\n';
    validMultipart += 'Content-Type: text/plain\r\n\r\n';
    validMultipart += fileContent + '\r\n';
    validMultipart += `--${boundary}--\r\n`;

    const uploadValidRes = await fetch(`${BASE_URL}/api/v1/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${studentToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: validMultipart
    });
    const uploadValidData = await uploadValidRes.json();
    reportTest(
      'Archivo íntegro aceptado con Checksum SHA-256 validado',
      uploadValidRes.status === 201 && uploadValidData.success && uploadValidData.post.attachments[0].checksum.includes(validSha256)
    );

    // 3.2 Subida con Hash Falsificado / Corrupto (Simulando pérdida de paquetes)
    const corruptedBoundary = '----WebKitFormBoundaryCorrupted001';
    let corruptedMultipart = `--${corruptedBoundary}\r\n`;
    corruptedMultipart += 'Content-Disposition: form-data; name="title"\r\n\r\nArchivo Corrupto Simulado\r\n';
    corruptedMultipart += `--${corruptedBoundary}\r\n`;
    corruptedMultipart += 'Content-Disposition: form-data; name="content"\r\n\r\nSimulación de paquetes corruptos en tránsito.\r\n';
    corruptedMultipart += `--${corruptedBoundary}\r\n`;
    corruptedMultipart += 'Content-Disposition: form-data; name="category_id"\r\n\r\nc1\r\n';
    corruptedMultipart += `--${corruptedBoundary}\r\n`;
    corruptedMultipart += 'Content-Disposition: form-data; name="copyright_declaration_accepted"\r\n\r\ntrue\r\n';
    corruptedMultipart += `--${corruptedBoundary}\r\n`;
    corruptedMultipart += 'Content-Disposition: form-data; name="file_checksum_0"\r\n\r\n0000000000000000000000000000000000000000000000000000000000000000\r\n';
    corruptedMultipart += `--${corruptedBoundary}\r\n`;
    corruptedMultipart += 'Content-Disposition: form-data; name="attachments"; filename="corrupto.txt"\r\n';
    corruptedMultipart += 'Content-Type: text/plain\r\n\r\n';
    corruptedMultipart += fileContent + '\r\n';
    corruptedMultipart += `--${corruptedBoundary}--\r\n`;

    const uploadCorruptRes = await fetch(`${BASE_URL}/api/v1/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${studentToken}`,
        'Content-Type': `multipart/form-data; boundary=${corruptedBoundary}`
      },
      body: corruptedMultipart
    });
    const uploadCorruptData = await uploadCorruptRes.json();
    reportTest(
      'Archivo corrupto detectado y rechazado de inmediato (HTTP 400)',
      uploadCorruptRes.status === 400 && uploadCorruptData.error.includes('SHA-256')
    );

    // Limpieza archivo temporal
    if (fs.existsSync(tempTestFile)) fs.unlinkSync(tempTestFile);

    // 4. Servicio de Retención Inteligente de Almacenamiento (LRU / 10 Días)
    console.log('\n--- 4. Política de Retención de Almacenamiento (Caché 10 Días) ---');
    const { getStorageMetrics, cleanExpiredFiles, recordFileAccess } = require('../backend/src/services/storageRetentionService');
    
    const initialMetrics = getStorageMetrics();
    reportTest('Métricas de almacenamiento del servidor calculadas', initialMetrics.totalFiles > 0 && initialMetrics.activeCount > 0);

    // Simular un archivo inactivo hace 15 días
    const { memoryStore } = require('../backend/src/config/db');
    const testOldFile = {
      id: 'old-test-file-001',
      uploader_id: 'u1111111-1111-1111-1111-111111111111',
      original_name: 'archivo_antiguo_inactivo.pdf',
      storage_key: 'test-inactivo.pdf',
      mime_type: 'application/pdf',
      file_size: 1024 * 500, // 500 KB
      status: 'AVAILABLE',
      last_accessed_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // Hace 15 días
      created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
    };
    memoryStore.files.push(testOldFile);

    const cleanupResult = await cleanExpiredFiles(10);
    reportTest(
      'Algoritmo LRU archiva archivos > 10 días sin consultas',
      cleanupResult.success && cleanupResult.archivedCount >= 1 && testOldFile.status === 'ARCHIVED'
    );

    // Simular acceso reactivando el archivo
    await recordFileAccess('old-test-file-001');
    reportTest(
      'Acceso posterior reactiva el archivo automáticamente',
      testOldFile.status === 'AVAILABLE' && testOldFile.access_count >= 1
    );

    // 5. Restricción de Roles en Endpoints de Servidor
    console.log('\n--- 5. Restricción de Acceso y Roles (Zero-Trust) ---');
    const studentCleanRes = await fetch(`${BASE_URL}/api/v1/security/clean-storage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ retentionDays: 10 })
    });
    reportTest(
      'Estudiante bloqueado de ejecutar tareas de mantenimiento del servidor (403 Forbidden)',
      studentCleanRes.status === 403
    );

    const adminCleanRes = await fetch(`${BASE_URL}/api/v1/security/clean-storage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ retentionDays: 10 })
    });
    reportTest(
      'Administrador autorizado para ejecutar mantenimiento del servidor (200 OK)',
      adminCleanRes.status === 200
    );

    // 6. Verificación de Infraestructura Contenerizada Oracle Cloud ARM64
    console.log('\n--- 6. Verificación de Infraestructura Docker Multi-Arch (ARM64) ---');
    const dockerfileContent = fs.readFileSync(path.join(__dirname, '../Dockerfile'), 'utf8');
    const dockerComposeContent = fs.readFileSync(path.join(__dirname, '../docker-compose.yml'), 'utf8');

    reportTest('Dockerfile usa base node:20-alpine para soporte ARM64', dockerfileContent.includes('node:20-alpine'));
    reportTest('Docker Compose usa postgres:16-alpine con límites de memoria', dockerComposeContent.includes('postgres:16-alpine') && dockerComposeContent.includes('limits'));

  } catch (error) {
    console.error('Error durante la ejecución del test suite:', error);
    failedCount++;
  } finally {
    if (server) {
      server.close();
      console.log('\n🛑 Servidor de pruebas cerrado.');
    }
  }

  console.log('\n====================================================================');
  console.log(`📊 RESULTADOS: ${passedCount} Aprobadas, ${failedCount} Fallidas`);
  console.log('====================================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
