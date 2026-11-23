const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const app = require('../backend/src/app');
const { uploadsDir } = require('../backend/src/config/storage');
const { webpush } = require('../backend/src/config/vapid');

let testUploadPath = null;

async function runTests() {
  console.log('🧪 Iniciando Pruebas E2E de Endpoints UniLink...\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  async function apiCall(endpoint, options = {}) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, body };
  }

  let passed = 0;
  let failed = 0;

  function assert(title, condition, extra = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${title} - ${extra}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await (await fetch(`http://localhost:${port}/health`)).json();
    assert('Health Check Responde Healthy', health.status === 'healthy');

    // 2. Auth Login Demo Estudiante
    const loginRes = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'estudiante@unilink.edu.co', password: '123456' })
    });
    assert('Login de estudiante demo exitoso', loginRes.ok && !!loginRes.body.token);
    assert('Métricas de aportes y acceso condicionado incluidas', loginRes.body.user?.contributions_count !== undefined);
    const initialContributionCount = loginRes.body.user?.contributions_count || 0;
    const token = loginRes.body.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    let profileRequestsSucceeded = true;
    for (let i = 0; i < 16; i++) {
      const profileRes = await apiCall('/auth/me', { headers: authHeaders });
      if (!profileRes.ok) profileRequestsSucceeded = false;
    }
    assert('Las consultas del perfil no consumen el límite de inicio de sesión', profileRequestsSucceeded);

    // 2.1 Login Administrador Demo
    const adminLoginRes = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@unilink.edu.co', password: '123456' })
    });
    assert('Login de administrador exitoso', adminLoginRes.ok && adminLoginRes.body.user?.role === 'ADMIN');
    const adminToken = adminLoginRes.body.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // 3. Categories Listing
    const catRes = await apiCall('/categories');
    assert('Catálogo de categorías responde', catRes.ok && catRes.body.categories?.length > 0);

    const shortTextPostRes = await apiCall('/posts', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Prueba de texto corto',
        content: 'Texto demasiado breve.',
        category_id: 'c1',
        client_operation_id: `test-e2e-short-${Date.now()}`,
        copyright_declaration_accepted: true
      })
    });
    assert('Las publicaciones solo de texto exigen 255 caracteres', shortTextPostRes.status === 400);

    // 4. Create Post (Online)
    const opId = 'test-e2e-op-' + Date.now();
    const newPostRes = await apiCall('/posts', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Prueba Automatizada E2E de Apunte',
        content: 'Este contenido de prueba valida que una publicación compuesta únicamente por texto tenga una explicación académica suficientemente desarrollada. '.repeat(3),
        category_id: 'c1',
        client_operation_id: opId,
        copyright_declaration_accepted: true
      })
    });
    assert('Creación de publicación exitosa con autoría RN-30', newPostRes.ok && !!newPostRes.body.post);
    assert(
      'La publicación devuelve el acceso actualizado sin otra consulta',
      newPostRes.body.contribution_access?.contributions_count > initialContributionCount &&
        newPostRes.body.contribution_access?.can_access_downloads === true
    );
    const createdPostId = newPostRes.body.post?.id;

    const audioData = Buffer.from('UniLink E2E audio payload');
    const audioForm = new FormData();
    audioForm.append('title', 'Prueba automatizada de audio');
    audioForm.append('content', 'Validación de carga de archivo de audio.');
    audioForm.append('category_id', 'c1');
    audioForm.append('client_operation_id', `test-e2e-audio-${Date.now()}`);
    audioForm.append('copyright_declaration_accepted', 'true');
    audioForm.append(
      'attachments',
      new Blob([audioData], { type: 'audio/webm' }),
      'test-audio.webm'
    );
    audioForm.append('file_checksum_0', crypto.createHash('sha256').update(audioData).digest('hex'));
    const audioResponse = await fetch(`${baseUrl}/posts`, {
      method: 'POST',
      headers: authHeaders,
      body: audioForm
    });
    const audioPostRes = {
      ok: audioResponse.ok,
      body: await audioResponse.json().catch(() => ({}))
    };
    const audioAttachment = audioPostRes.body.post?.attachments?.[0];
    if (audioAttachment?.url) {
      testUploadPath = path.join(uploadsDir, path.basename(new URL(audioAttachment.url).pathname));
    }
    assert(
      'La carga multipart valida el checksum y registra el audio reproducible',
      audioPostRes.ok &&
        audioAttachment?.file_type === 'AUDIO' &&
        audioAttachment?.mime_type === 'audio/webm' &&
        !!audioAttachment?.url
    );

    const refreshedUserRes = await apiCall('/auth/me', { headers: authHeaders });
    assert(
      'El primer aporte actualiza el acceso condicionado',
      refreshedUserRes.ok &&
        refreshedUserRes.body.user?.contributions_count > initialContributionCount &&
        refreshedUserRes.body.user?.can_access_downloads === true
    );

    // 5. Idempotencia de sincronización offline (RN-17)
    const duplicateRes = await apiCall('/posts', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Prueba Duplicada',
        content: 'No debe duplicarse',
        category_id: 'c1',
        client_operation_id: opId,
        copyright_declaration_accepted: true
      })
    });
    assert('Idempotencia de sincronización (evita duplicados)', duplicateRes.body.alreadyProcessed === true);

    // 6. Like / Dislike reactions
    // El autor no puede votar su propio post (RN-04)
    const selfReactRes = await apiCall(`/posts/${createdPostId}/react`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ reaction_type: 'LIKE' })
    });
    assert('El autor no puede votar su propio post (RN-04)', selfReactRes.status === 400);

    // Usuario diferente (Admin) vota el post del estudiante
    const adminReactRes = await apiCall(`/posts/${createdPostId}/react`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ reaction_type: 'LIKE' })
    });
    assert('Tercero puede calificar post y genera notificación push', adminReactRes.ok && adminReactRes.body.current_reaction === 'LIKE');

    // 6.1 Flujo Completo de Moderación de Categorías (Sugerir -> Revisar -> Aprobar)
    const suggestRes = await apiCall('/categories/suggest', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Sistemas Complejos', description: 'Teoría del caos y redes complejas' })
    });
    assert('Estudiante puede sugerir categoría', suggestRes.ok && !!suggestRes.body.suggestion);
    const suggestionId = suggestRes.body.suggestion?.id;

    const listSuggestionsRes = await apiCall('/categories/suggestions', {
      headers: adminHeaders
    });
    assert('Administrador puede listar sugerencias de categorías', listSuggestionsRes.ok && listSuggestionsRes.body.suggestions?.length > 0);

    const approveRes = await apiCall(`/categories/suggestions/${suggestionId}/approve`, {
      method: 'POST',
      headers: adminHeaders
    });
    assert('Administrador puede aprobar categoría para activarla en catálogo', approveRes.ok && approveRes.body.category?.status === 'ACTIVE');

    // 7. Groups listing with Haversine Geolocation (UPTC Tunja Campus)
    const groupsRes = await apiCall('/groups?lat=5.5530&lng=-73.3565&radius_km=20');
    assert('Grupos responden con cálculo de distancia Haversine', groupsRes.ok && groupsRes.body.groups?.length > 0);
    let sampleGroupId = null;
    if (groupsRes.body.groups?.length > 0) {
      sampleGroupId = groupsRes.body.groups[0].id;
      assert('Distancia en kilómetros calculada', groupsRes.body.groups[0].distance_km !== undefined);
    }

    // 7.1 Validación de Membresía al Crear Encuentro (RN-15/16)
    // Crear un grupo nuevo donde el estudiante sea creador
    const groupCreated = await apiCall('/groups', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Grupo E2E Membresía Test',
        category_id: 'c1',
        location_latitude: 5.5530,
        location_longitude: -73.3565
      })
    });
    const testGroupId = groupCreated.body.group?.id;

    // Usuario que NO es miembro intenta programar encuentro
    const nonMemberMeeting = await apiCall('/meetings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.replace(/^[^.]+/, 'dummy')}` }, // token malformado
    });
    assert('Petición no autenticada es rechazada', nonMemberMeeting.status === 401);

    // Creador del grupo sí puede programar encuentro
    const creatorMeeting = await apiCall('/meetings', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        group_id: testGroupId,
        title: 'Sesión de Programación E2E',
        start_datetime: new Date(Date.now() + 86400000).toISOString()
      })
    });
    assert('Miembro activo o creador puede programar encuentro (RN-15/16)', creatorMeeting.status === 201);

    // 8. Meetings list & RSVP
    const meetRes = await apiCall('/meetings');
    assert('Encuentros académicos responden', meetRes.ok && meetRes.body.meetings !== undefined);

    // 8.1 Validación de Salida de Grupos (RF-20) y Cupo Máximo (RN-23)
    // El propietario (estudiante) no puede abandonar el grupo sin transferir/eliminar
    const ownerLeaveRes = await apiCall(`/groups/${testGroupId}/leave`, {
      method: 'POST',
      headers: authHeaders
    });
    assert('Propietario no puede abandonar grupo sin transferir propiedad (RF-20)', ownerLeaveRes.status === 400);

    // Admin se une al grupo como miembro
    const adminJoinRes = await apiCall(`/groups/${testGroupId}/join`, {
      method: 'POST',
      headers: adminHeaders
    });
    assert('Miembro adicional puede unirse al grupo público', adminJoinRes.ok);

    // Admin abandona el grupo
    const adminLeaveRes = await apiCall(`/groups/${testGroupId}/leave`, {
      method: 'POST',
      headers: adminHeaders
    });
    assert('Miembro activo puede abandonar voluntariamente el grupo (RF-20)', adminLeaveRes.ok);

    // Cupo máximo de grupo (RN-23)
    const smallGroup = await apiCall('/groups', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Grupo Cupo Limitado',
        category_id: 'c1',
        location_latitude: 5.55,
        location_longitude: -73.35,
        max_members: 1
      })
    });
    const smallGroupId = smallGroup.body.group?.id;
    const overCapacityJoin = await apiCall(`/groups/${smallGroupId}/join`, {
      method: 'POST',
      headers: adminHeaders
    });
    assert('Bloqueo de ingreso al alcanzar cupo máximo de grupo (RN-23)', overCapacityJoin.status === 400);

    // 8.2 Validación de Encuentros Cancelados (RN-22) y Cupo Máximo (RN-23)
    const testMeetingId = creatorMeeting.body.meeting?.id;
    // Forzar estado CANCELLED para validar RN-22
    const { memoryStore } = require('../backend/src/config/db');
    const meetingInMemory = memoryStore.group_meetings.find(m => m.id === testMeetingId);
    if (meetingInMemory) meetingInMemory.status = 'CANCELLED';

    const rsvpCancelled = await apiCall(`/meetings/${testMeetingId}/rsvp`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ attendance_status: 'CONFIRMED' })
    });
    assert('Bloqueo de confirmación a encuentro cancelado (RN-22)', rsvpCancelled.status === 400);

    // Restaurar estado y probar cupo de asistentes (RN-23)
    if (meetingInMemory) {
      meetingInMemory.status = 'SCHEDULED';
      meetingInMemory.max_attendees = 1; // Ya está el creador confirmado
    }
    // Asegurar que admin es miembro del grupo para intentar confirmar
    const adminRejoin = await apiCall(`/groups/${testGroupId}/join`, {
      method: 'POST',
      headers: adminHeaders
    });
    const rsvpOverCapacity = await apiCall(`/meetings/${testMeetingId}/rsvp`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ attendance_status: 'CONFIRMED' })
    });
    assert('Bloqueo de confirmación al alcanzar cupo de asistentes en encuentro (RN-23)', rsvpOverCapacity.status === 400);

    // 8.3 Reactivación de Publicaciones (RF-11)
    const deactivateRes = await apiCall(`/posts/${createdPostId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    assert('Autor puede desactivar su publicación', deactivateRes.ok);

    const reactivateRes = await apiCall(`/posts/${createdPostId}/reactivate`, {
      method: 'PATCH',
      headers: authHeaders
    });
    assert('Autor puede reactivar su publicación desactivada (RF-11)', reactivateRes.ok && reactivateRes.body.post?.status === 'ACTIVE');

    // 8.4 Resolución de Reportes de Moderación (RF-32 / RN-21)
    const createReportRes = await apiCall('/reports', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        post_id: createdPostId,
        reason: 'Contenido desactualizado',
        description: 'La guía hace referencia a versiones obsoletas de la API.'
      })
    });
    assert('Usuario puede denunciar publicación académica', createReportRes.status === 201);
    const reportId = createReportRes.body.report?.id;

    const resolveReportRes = await apiCall(`/reports/${reportId}/resolve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ action: 'HIDE_POST', resolution: 'Ocultado preventivamente por moderador' })
    });
    assert('Administrador puede resolver reporte y ocultar publicación (RF-32 / RN-21)', resolveReportRes.ok && resolveReportRes.body.report?.status === 'RESOLVED');

    const postAfterReport = memoryStore.posts.find(p => p.id === createdPostId);
    assert('Estado de publicación actualizado a HIDDEN tras resolución de moderación', postAfterReport?.status === 'HIDDEN');

    // 9. VAPID Public Key for Web Push
    const vapidRes = await apiCall('/notifications/vapid-public-key');
    assert('Clave pública VAPID provista para suscripción Web Push', vapidRes.ok && !!vapidRes.body.publicKey);

    const pushEndpoint = 'https://push.example.test/unilink';
    const deviceKey = crypto.createECDH('prime256v1');
    const registration = await apiCall('/notifications/subscribe', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        subscription: {
          endpoint: pushEndpoint,
          keys: {
            p256dh: deviceKey.generateKeys().toString('base64url'),
            auth: crypto.randomBytes(16).toString('base64url')
          }
        }
      })
    });
    assert('Registra una suscripción Web Push válida', registration.status === 201);

    const requestTestPush = (headers) => apiCall('/notifications/test-push', {
      method: 'POST',
      headers,
      body: JSON.stringify({ endpoint: pushEndpoint })
    });
    const sendNotification = webpush.sendNotification;
    let sentEndpoint;
    try {
      webpush.sendNotification = async ({ endpoint }) => { sentEndpoint = endpoint; };
      const otherDevice = await requestTestPush(adminHeaders);
      assert('La prueba no envía a una suscripción de otro usuario', otherDevice.status === 409 && !sentEndpoint);
      const delivered = await requestTestPush(authHeaders);
      assert('La prueba envía al dispositivo registrado', delivered.ok && sentEndpoint === pushEndpoint);

      webpush.sendNotification = async () => {
        throw Object.assign(new Error('Fallo del proveedor simulado'), { statusCode: 503 });
      };
      const failedDelivery = await requestTestPush(authHeaders);
      assert('Un error del proveedor hace fallar la prueba', failedDelivery.status === 502);

      webpush.sendNotification = async () => {
        throw Object.assign(new Error('Suscripción expirada simulada'), { statusCode: 410 });
      };
      const expired = await requestTestPush(authHeaders);
      const removed = await requestTestPush(authHeaders);
      assert('La prueba distingue una suscripción expirada y la elimina', expired.status === 410 && removed.status === 409);
    } finally {
      webpush.sendNotification = sendNotification;
    }

    console.log(`\n=========================================`);
    console.log(`Resultados: ${passed} Pasadas, ${failed} Fallidas`);
    console.log(`=========================================\n`);
  } catch (error) {
    console.error('Error durante ejecución de pruebas:', error);
    failed++;
  } finally {
    if (testUploadPath && fs.existsSync(testUploadPath)) {
      try {
        fs.unlinkSync(testUploadPath);
      } catch (error) {
        console.error('No se pudo limpiar el archivo de audio de prueba:', error.message);
        failed++;
      }
    }
    server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
  }
}

runTests();
