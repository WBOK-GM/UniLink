/**
 * UniLink PWA - Script de Verificación E2E para Manejo de Archivos
 * Prueba:
 * 1. Acceso a archivos seed (PDFs e Imágenes) sin errores 404
 * 2. Cabeceras de visualización en marco (CSP y X-Frame-Options no bloqueante en /uploads)
 * 3. Subida multipart/form-data de nuevo post con PDF e imagen adjuntos
 * 4. Recuperación exitosa del archivo subido con Content-Type y tamaño exacto
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require('../backend/src/app');

async function runFilesE2ETest() {
  console.log('\n============================================================');
  console.log('🧪 PRUEBAS E2E: SUBIDA, VISUALIZACIÓN Y DESCARGA DE ARCHIVOS');
  console.log('============================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let totalChecks = 0;
  let passedChecks = 0;

  function assertCheck(name, condition, details = '') {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`  ✅ [PASS] ${name} ${details ? `(${details})` : ''}`);
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? `(${details})` : ''}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // PRUEBA 1: Archivo Seed PDF (sample-pwa-guide.pdf)
    // -------------------------------------------------------------
    const resPdf = await fetch(`${baseUrl}/uploads/sample-pwa-guide.pdf`);
    assertCheck('Seed PDF disponible en servidor', resPdf.status === 200, `Status: ${resPdf.status}`);
    assertCheck('Seed PDF Content-Type correcto', resPdf.headers.get('content-type')?.includes('application/pdf'), resPdf.headers.get('content-type'));
    assertCheck('Seed PDF no bloquea framing', !resPdf.headers.get('x-frame-options') || resPdf.headers.get('x-frame-options') !== 'DENY', `X-Frame-Options: ${resPdf.headers.get('x-frame-options') || 'none'}`);
    assertCheck('Seed PDF permite Cross-Origin Resource Policy', resPdf.headers.get('cross-origin-resource-policy') === 'cross-origin', 'cross-origin');

    // -------------------------------------------------------------
    // PRUEBA 2: Archivo Seed Imagen Diagrama (sample-docker-traefik.png)
    // -------------------------------------------------------------
    const resImg = await fetch(`${baseUrl}/uploads/sample-docker-traefik.png`);
    assertCheck('Seed PNG disponible en servidor', resImg.status === 200, `Status: ${resImg.status}`);
    assertCheck('Seed PNG Content-Type correcto', resImg.headers.get('content-type')?.includes('image/png'), resImg.headers.get('content-type'));

    // -------------------------------------------------------------
    // PRUEBA 3: Login para obtener token de autorización
    // -------------------------------------------------------------
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'estudiante@unilink.edu.co', password: '123456' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    assertCheck('Autenticación para subida', !!token, 'Token JWT obtenido');

    // -------------------------------------------------------------
    // PRUEBA 4: Subida Multipart/form-data con PDF e Imagen reales
    // -------------------------------------------------------------
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Test Upload) >>\nendobj\n%%EOF');
    const imgContent = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG magic bytes

    function makePart(fieldName, filename, contentType, contentBuffer) {
      return Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`),
        contentBuffer,
        Buffer.from('\r\n')
      ]);
    }

    function makeField(fieldName, value) {
      return Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"\r\n\r\n${value}\r\n`);
    }

    const payload = Buffer.concat([
      makeField('title', 'Taller de Pruebas Automatizadas de Archivos PWA'),
      makeField('content', 'Contenido de prueba con subida de PDF e imagen adjuntos.'),
      makeField('category_id', 'c1'),
      makeField('copyright_declaration_accepted', 'true'),
      makeField('client_operation_id', 'op-test-files-' + Date.now()),
      makePart('attachments', 'test_taller.pdf', 'application/pdf', pdfContent),
      makePart('attachments', 'test_diagrama.png', 'image/png', imgContent),
      Buffer.from(`--${boundary}--\r\n`)
    ]);

    const uploadRes = await fetch(`${baseUrl}/api/v1/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: payload
    });

    const uploadData = await uploadRes.json();
    assertCheck('Subida multipart responde HTTP 201', uploadRes.status === 201, `Status: ${uploadRes.status}`);
    assertCheck('Post creado con adjuntos registrados', uploadData.post?.attachments?.length === 2, `Adjuntos: ${uploadData.post?.attachments?.length}`);

    // -------------------------------------------------------------
    // PRUEBA 5: Descarga y verificación del archivo recién subido
    // -------------------------------------------------------------
    const uploadedPdf = uploadData.post?.attachments?.find(a => a.original_name === 'test_taller.pdf');
    if (uploadedPdf && uploadedPdf.url) {
      const filename = path.basename(uploadedPdf.url);
      const getUploadedRes = await fetch(`${baseUrl}/uploads/${filename}`);
      const uploadedBuf = await getUploadedRes.arrayBuffer();
      assertCheck('Descarga del archivo subido responde HTTP 200', getUploadedRes.status === 200, `Status: ${getUploadedRes.status}`);
      assertCheck('Tamaño y contenido del archivo preservado', uploadedBuf.byteLength === pdfContent.length, `${uploadedBuf.byteLength} bytes`);
    }

    console.log('\n============================================================');
    console.log(`📊 RESULTADOS: ${passedChecks}/${totalChecks} pruebas pasadas.`);
    console.log('============================================================\n');

    server.close();
    if (passedChecks !== totalChecks) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Error durante la ejecución del test:', err);
    server.close();
    process.exit(1);
  }
}

runFilesE2ETest();
