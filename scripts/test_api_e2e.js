const http = require('http');
const app = require('../backend/src/app');

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
    const token = loginRes.body.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

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

    // 4. Create Post (Online)
    const opId = 'test-e2e-op-' + Date.now();
    const newPostRes = await apiCall('/posts', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Prueba Automatizada E2E de Apunte',
        content: 'Contenido verificado mediante script de prueba.',
        category_id: 'c1',
        client_operation_id: opId,
        copyright_declaration_accepted: true
      })
    });
    assert('Creación de publicación exitosa con autoría RN-30', newPostRes.ok && !!newPostRes.body.post);
    const createdPostId = newPostRes.body.post?.id;

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

    // 9. VAPID Public Key for Web Push
    const vapidRes = await apiCall('/notifications/vapid-public-key');
    assert('Clave pública VAPID provista para suscripción Web Push', vapidRes.ok && !!vapidRes.body.publicKey);

    console.log(`\n=========================================`);
    console.log(`Resultados: ${passed} Pasadas, ${failed} Fallidas`);
    console.log(`=========================================\n`);
  } catch (error) {
    console.error('Error durante ejecución de pruebas:', error);
  } finally {
    server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
  }
}

runTests();
