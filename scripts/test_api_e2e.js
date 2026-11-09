const http = require('http');
const app = require('../backend/src/app');

async function runTests() {
  console.log('🧪 Iniciando Pruebas E2E de Endpoints UniLink...\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5099, resolve));
  const baseUrl = 'http://localhost:5099/api/v1';

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
    const health = await (await fetch('http://localhost:5099/health')).json();
    assert('Health Check Responde Healthy', health.status === 'healthy');

    // 2. Auth Login Demo Estudiante
    const loginRes = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'estudiante@unilink.edu.co', password: '123456' })
    });
    assert('Login de estudiante demo exitoso', loginRes.ok && !!loginRes.body.token);
    const token = loginRes.body.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

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

    // 7. Groups listing with Haversine Geolocation
    const groupsRes = await apiCall('/groups?lat=4.60971&lng=-74.08175&radius_km=20');
    assert('Grupos responden con cálculo de distancia Haversine', groupsRes.ok && groupsRes.body.groups?.length > 0);
    if (groupsRes.body.groups?.length > 0) {
      assert('Distancia en kilómetros calculada', groupsRes.body.groups[0].distance_km !== undefined);
    }

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
    server.close();
  }
}

runTests();
