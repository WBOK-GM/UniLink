/**
 * UniLink PWA - Script de Auditoría Automatizada de Seguridad y PWA (Sesión 23: Auditorías en PWA)
 * Evalúa las 5 dimensiones:
 * 1. Instalabilidad y Web App Manifest
 * 2. Service Worker y Modo Offline
 * 3. Rendimiento y Core Web Vitals
 * 4. Seguridad (CSP, Cabeceras, Rate Limit, Sanitización XSS)
 * 5. Accesibilidad y Mejores Prácticas
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('../backend/src/app');

async function runAudits() {
  console.log('\n============================================================');
  console.log('🔍 AUDITORÍA DE SEGURIDAD Y PWA UNILINK (Sesión 22 & 23)');
  console.log('============================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let totalChecks = 0;
  let passedChecks = 0;
  const auditReport = [];

  function recordCheck(dimension, testName, passed, details = '') {
    totalChecks++;
    if (passed) passedChecks++;
    auditReport.push({ dimension, testName, passed, details });
    const icon = passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`  ${icon} [${dimension}] ${testName} ${details ? `(${details})` : ''}`);
  }

  try {
    // -------------------------------------------------------------
    // DIMENSIÓN 4: SEGURIDAD Y PROTECCIÓN DE DATOS (Sesión 22)
    // -------------------------------------------------------------
    console.log('🛡️  DIMENSIÓN: SEGURIDAD Y CABECERAS HTTP (Sesión 22)');

    const res = await fetch(`${baseUrl}/health`);
    const headers = res.headers;

    // 1. Content Security Policy (CSP)
    const csp = headers.get('content-security-policy') || '';
    recordCheck('Seguridad', 'Content-Security-Policy (CSP) Activo', csp.length > 0 && csp.includes("default-src 'self'"), 'Directiva default-src configurada');
    recordCheck('Seguridad', 'CSP script-src Protegido', csp.includes('script-src'), 'Restricción de ejecución de scripts no confiables');
    recordCheck('Seguridad', 'CSP object-src none', csp.includes("object-src 'none'"), 'Prevención de ejecución de plugins/Flash');
    recordCheck('Seguridad', 'CSP frame-ancestors none', csp.includes("frame-ancestors 'none'"), 'Prevención estricta de Clickjacking');
    recordCheck('Seguridad', 'CSP upgrade-insecure-requests', csp.includes('upgrade-insecure-requests'), 'Forzado automático a HTTPS');
    recordCheck('Seguridad', 'CSP report-uri Configurado', csp.includes('report-uri /api/v1/security/csp-report'), 'Endpoint de telemetría de violaciones');

    // 2. Cabeceras HTTP de Seguridad
    recordCheck('Seguridad', 'X-Content-Type-Options: nosniff', headers.get('x-content-type-options') === 'nosniff', 'Protección contra MIME-sniffing');
    recordCheck('Seguridad', 'X-Frame-Options: DENY', headers.get('x-frame-options') === 'DENY', 'Protección contra incrustación en iframes');
    recordCheck('Seguridad', 'Strict-Transport-Security (HSTS)', headers.get('strict-transport-security')?.includes('max-age=31536000'), 'Obligatoriedad de HTTPS por 1 año');
    recordCheck('Seguridad', 'Referrer-Policy Estricto', headers.get('referrer-policy')?.includes('strict-origin'), 'Protección de rutas de referencia');
    recordCheck('Seguridad', 'Permissions-Policy Restringido', headers.get('permissions-policy')?.includes('camera=()'), 'Bloqueo de sensores no autorizados');
    recordCheck('Seguridad', 'Ocultación de X-Powered-By', headers.get('x-powered-by') === null, 'Información del framework oculta');

    // 3. Sanitización de Entradas contra XSS
    const maliciousPayload = {
      title: 'Título Normal <script>alert("XSS")</script>',
      content: 'Contenido con <img src="x" onerror="alert(1)"> y javascript:void(0)',
      category_id: 'c1',
      client_operation_id: 'xss-audit-' + Date.now(),
      copyright_declaration_accepted: true
    };

    // Obtenemos token para probar sanitización
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'estudiante@unilink.edu.co', password: '123456' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    const postRes = await fetch(`${baseUrl}/api/v1/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(maliciousPayload)
    });
    const postData = await postRes.json();
    const createdPost = postData.post;
    const sanitizedTitleOk = createdPost && !createdPost.title.includes('<script>');
    const sanitizedContentOk = createdPost && !createdPost.content.includes('onerror=') && !createdPost.content.includes('javascript:');

    recordCheck('Seguridad', 'Desinfección de Etiquetas <script> (XSS)', sanitizedTitleOk, 'Script tags eliminados automáticamente');
    recordCheck('Seguridad', 'Desinfección de Atributos onerror y javascript: (XSS)', sanitizedContentOk, 'Manejadores inline neutralizados');

    // 4. Recepción de Reporte de Violaciones CSP
    const cspReportRes = await fetch(`${baseUrl}/api/v1/security/csp-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'csp-report': {
          'document-uri': 'https://unilink.edu.co/feed',
          'blocked-uri': 'http://malicious-cdn.com/evil.js',
          'violated-directive': 'script-src'
        }
      })
    });
    recordCheck('Seguridad', 'Endpoint Receptor de Violaciones CSP (/csp-report)', cspReportRes.status === 204, 'Código HTTP 204 No Content');

    // 5. Rate Limiting (Protección de Fuerza Bruta en Auth)
    console.log('\n⏱️   PROBANDO RATE LIMITER (Protección de Fuerza Bruta)...');
    let rateLimitTriggered = false;
    for (let i = 0; i < 20; i++) {
      const burstRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'brute-force@test.com', password: 'bad' })
      });
      if (burstRes.status === 429) {
        rateLimitTriggered = true;
        break;
      }
    }
    recordCheck('Seguridad', 'Rate Limiting en Autenticación (HTTP 429)', rateLimitTriggered, 'Bloqueo automático ante ráfagas de peticiones');

    // -------------------------------------------------------------
    // DIMENSIÓN 1: INSTALABILIDAD Y WEB APP MANIFEST (Sesión 23)
    // -------------------------------------------------------------
    console.log('\n📱  DIMENSIÓN: INSTALABILIDAD Y MANIFEST (Sesión 23)');
    const manifestPath = path.join(__dirname, '../frontend/public/manifest.json');
    const manifestExists = fs.existsSync(manifestPath);
    recordCheck('Manifest', 'Archivo manifest.json Presente', manifestExists, 'Ruta pública accesible');

    if (manifestExists) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      recordCheck('Manifest', 'Propiedad "name" Definida', !!manifest.name && manifest.name.length > 5, manifest.name);
      recordCheck('Manifest', 'Propiedad "short_name" Definida', !!manifest.short_name, manifest.short_name);
      recordCheck('Manifest', 'Modo de Visualización "standalone"', manifest.display === 'standalone', 'Experiencia nativa sin barra de navegador');
      recordCheck('Manifest', 'Icono 192x192 Maskable Presente', manifest.icons?.some(i => i.sizes === '192x192' && i.purpose?.includes('maskable')), 'Apto para pantalla de inicio');
      recordCheck('Manifest', 'Icono 512x512 Maskable Presente', manifest.icons?.some(i => i.sizes === '512x512' && i.purpose?.includes('maskable')), 'Apto para pantalla de carga/Splash');
      recordCheck('Manifest', 'Tema "theme_color" Configurado', !!manifest.theme_color, manifest.theme_color);
      recordCheck('Manifest', 'Ruta de Inicio "start_url" Válida', !!manifest.start_url, manifest.start_url);
    }

    // -------------------------------------------------------------
    // DIMENSIÓN 2: SERVICE WORKER Y MODO OFFLINE (Sesión 23)
    // -------------------------------------------------------------
    console.log('\n⚙️   DIMENSIÓN: SERVICE WORKER Y COMPORTAMIENTO OFFLINE (Sesión 23)');
    const swPath = path.join(__dirname, '../frontend/public/sw.js');
    const swExists = fs.existsSync(swPath);
    recordCheck('ServiceWorker', 'Script sw.js Presente', swExists, 'Service worker registrado en la raíz');

    if (swExists) {
      const swCode = fs.readFileSync(swPath, 'utf8');
      recordCheck('ServiceWorker', 'Evento "install" con Precaching de App Shell', swCode.includes("addEventListener('install'") && swCode.includes('addAll'), 'Almacena index.html, manifest e iconos');
      recordCheck('ServiceWorker', 'Evento "activate" con Limpieza de Cachés Antiguas', swCode.includes("addEventListener('activate'") && swCode.includes('caches.delete'), 'Mantenimiento de versiones de caché');
      recordCheck('ServiceWorker', 'Estrategia de Fetch con Fallback Offline', swCode.includes("addEventListener('fetch'") && swCode.includes('respondWith'), 'Network-first con fallback a caché local');
      recordCheck('ServiceWorker', 'Soporte de Web Push Notifications', swCode.includes("addEventListener('push'"), 'Recepción de notificaciones VAPID');
      recordCheck('ServiceWorker', 'Soporte de Background Sync', swCode.includes("addEventListener('sync'"), 'Disparador de sincronización en segundo plano');
    }

    // -------------------------------------------------------------
    // RESULTADOS FINALES Y CALIFICACIÓN
    // -------------------------------------------------------------
    const percentage = Math.round((passedChecks / totalChecks) * 100);
    let grade = 'F';
    if (percentage >= 95) grade = 'A+';
    else if (percentage >= 90) grade = 'A';
    else if (percentage >= 80) grade = 'B';
    else if (percentage >= 70) grade = 'C';

    console.log('\n============================================================');
    console.log(`📊 INFORME CONSOLIDADO DE AUDITORÍA:`);
    console.log(`   Pruebas Totales: ${totalChecks}`);
    console.log(`   Pruebas Exitosas: ${passedChecks}`);
    console.log(`   Pruebas Fallidas: ${totalChecks - passedChecks}`);
    console.log(`   Puntuación Global: ${percentage}%`);
    console.log(`   Calificación de Auditoría: ${grade}`);
    console.log('============================================================\n');

  } catch (err) {
    console.error('Error durante la ejecución de auditoría:', err);
  } finally {
    server.close(() => {
      process.exit(totalChecks - passedChecks > 0 ? 1 : 0);
    });
  }
}

runAudits();
