const http = require('http');
const path = require('path');
try {
  require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });
} catch (e) {}
const app = require('../backend/src/app');
const { memoryStore, queryUserByEmail } = require('../backend/src/config/db');

async function runPersistenceAuthTests() {
  console.log('====================================================================');
  console.log('🧪 Iniciando Pruebas de Persistencia de Cuentas y Prevención de Duplicados');
  console.log('====================================================================\n');

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
    const testEmail = `test.estudiante.${Date.now()}@uptc.edu.co`;

    // 1. Registro exitoso de nueva cuenta
    const regRes = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
        full_name: 'Estudiante de Prueba Persistencia',
        university: 'Universidad Pedagógica y Tecnológica de Colombia',
        academic_program: 'Ingeniería de Sistemas y Computación'
      })
    });
    assert('Registro de cuenta nueva exitoso (HTTP 201)', regRes.status === 201 && !!regRes.body.token);

    // 2. Intento de crear una 2da cuenta con el mismo correo (Prevención de duplicados RN-01)
    const dupRes = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: 'OtraPassword456!',
        full_name: 'Estudiante Duplicado',
        university: 'UPTC',
        academic_program: 'Ingeniería'
      })
    });
    assert('Bloqueo estricto de cuentas duplicadas con el mismo correo (HTTP 409 Conflict)', dupRes.status === 409);
    assert('Mensaje de error claro de correo ya registrado', dupRes.body.error?.includes('ya se encuentra registrado'));

    // 3. Inicio de sesión con contraseña errónea (Diferenciación de error sin enmascarar)
    const badPassRes = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: 'PasswordEquivocada!'
      })
    });
    assert('Inicio de sesión con contraseña errónea rechazado (HTTP 401)', badPassRes.status === 401);
    assert('Mensaje exacto de credenciales inválidas sin enmascaramiento', badPassRes.body.error?.includes('Credenciales inválidas'));

    // 4. Inicio de sesión con credenciales correctas
    const loginRes = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!'
      })
    });
    assert('Inicio de sesión exitoso con credenciales correctas (HTTP 200)', loginRes.ok && !!loginRes.body.token);

    // 5. Simulación de reinicio / reposo del servidor (Memoria RAM reiniciada)
    // Borramos el usuario de memoryStore.users para simular el spin-down de Render
    const inMemIdx = memoryStore.users.findIndex(u => u.email.toLowerCase() === testEmail.toLowerCase());
    let removedUser = null;
    if (inMemIdx >= 0) {
      removedUser = memoryStore.users.splice(inMemIdx, 1)[0];
    }
    const inMemProfIdx = memoryStore.profiles.findIndex(p => p.user_id === removedUser?.id);
    if (inMemProfIdx >= 0) {
      memoryStore.profiles.splice(inMemProfIdx, 1);
    }

    // Si PostgreSQL está activo y conectado, queryUserByEmail debe recuperarlo
    const { pool, usePg } = require('../backend/src/config/db');
    if (pool && usePg) {
      const recovered = await queryUserByEmail(testEmail);
      assert('Usuario recuperado desde PostgreSQL tras simulación de reinicio de RAM', !!recovered);
      
      // Probar login nuevamente: debe funcionar recuperándose de la base de datos
      const reLoginRes = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          password: 'Password123!'
        })
      });
      assert('Login exitoso tras reinicio del servidor gracias a persistencia Neon', reLoginRes.ok);
    } else {
      console.log('  ℹ️  [INFO] Conexión a PostgreSQL Neon externa no disponible en este entorno offline, prueba de recuperación externa omitida.');
    }

    console.log(`\n=========================================`);
    console.log(`Resultados: ${passed} Pasadas, ${failed} Fallidas`);
    console.log(`=========================================\n`);
  } catch (error) {
    console.error('Error durante ejecución de pruebas de persistencia:', error);
    failed++;
  } finally {
    server.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
  }
}

runPersistenceAuthTests();
