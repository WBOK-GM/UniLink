/**
 * UniLink PWA - Automated End-to-End Application Flow & Security Test
 * Valida:
 * 1. Protección de rutas y seguridad de tokens (HTTP 401 sin token).
 * 2. Registro institucional de nuevos estudiantes (RN-01 unicidad).
 * 3. Inicio de sesión del usuario demo oficial (estudiante@unilink.edu.co).
 * 4. Creación de grupos y asignación automática del rol OWNER.
 * 5. Ingreso de miembros con rol MEMBER (RN-09).
 * 6. Creación, asignación y transición de estados en tareas grupales (TODO -> IN_PROGRESS -> DONE).
 * 7. Consulta de integrantes con sus roles.
 */

const http = require('http');
const assert = require('assert');
const app = require('../backend/src/app');

let server;
const PORT = 5098;
const BASE_URL = `http://127.0.0.1:${PORT}/api/v1`;

let passed = 0;
let failed = 0;

function test(name, ok, details = '') {
  if (ok) {
    console.log(`  ✅ [PASS] ${name}${details ? ` (${details})` : ''}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${name}${details ? ` (${details})` : ''}`);
    failed++;
  }
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const parsed = new URL(url);

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  server = app.listen(PORT);
  console.log('\n============================================================');
  console.log('🧪 PRUEBAS E2E: SEGURIDAD, REGISTRO, LOGIN, GRUPOS Y TAREAS');
  console.log('============================================================\n');

  try {
    // 1. SEGURIDAD: Rutas protegidas deben rechazar sin token
    const unauthPost = await request('/posts', { method: 'POST', body: { title: 'No auth' } });
    test('Seguridad: POST /posts sin token es bloqueado con HTTP 401', unauthPost.status === 401);

    const unauthMe = await request('/auth/me');
    test('Seguridad: GET /auth/me sin token es bloqueado con HTTP 401', unauthMe.status === 401);

    const unauthCreateGroup = await request('/groups', { method: 'POST', body: { name: 'Hack Group' } });
    test('Seguridad: POST /groups sin token es bloqueado con HTTP 401', unauthCreateGroup.status === 401);

    // 2. REGISTRO INSTITUCIONAL DE NUEVO ESTUDIANTE (RN-01)
    const testEmail = `estudiante.flujo.${Date.now()}@uptc.edu.co`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'PasswordSegura2025*',
        full_name: 'Camila Rodriguez UPTC',
        university: 'Universidad Pedagógica y Tecnológica de Colombia (UPTC)',
        academic_program: 'Ingeniería de Sistemas',
        semester: 7
      }
    });
    test('Registro de estudiante exitoso con token JWT y perfil', regRes.status === 201 && !!regRes.body.token);
    const newStudentToken = regRes.body.token;

    // Verificar unicidad de correo (RN-01)
    const dupRegRes = await request('/auth/register', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'OtraPassword*',
        full_name: 'Duplicado'
      }
    });
    test('Validación RN-01: Rechazo de correo ya registrado con HTTP 409', dupRegRes.status === 409);

    // 3. INICIO DE SESIÓN CON USUARIO DEMO OFICIAL
    const demoLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'estudiante@unilink.edu.co', password: '123456' }
    });
    test('Login de usuario demo oficial (estudiante@unilink.edu.co) exitoso', demoLoginRes.ok && !!demoLoginRes.body.token);
    const demoToken = demoLoginRes.body.token;
    const demoHeaders = { Authorization: `Bearer ${demoToken}` };

    // 4. CREACIÓN DE GRUPO DE ESTUDIO (Rol OWNER automático)
    const groupRes = await request('/groups', {
      method: 'POST',
      headers: demoHeaders,
      body: {
        name: 'Semillero de Redes Neuronales y PWA UPTC',
        description: 'Grupo académico para desarrollo de proyectos distribuidos y offline-first.',
        category_id: 'c1',
        group_type: 'PUBLIC',
        max_members: 25,
        location_latitude: 5.5525,
        location_longitude: -73.3553
      }
    });
    test('Creación de grupo de estudio responde HTTP 201', groupRes.status === 201 && !!groupRes.body.group?.id);
    const createdGroupId = groupRes.body.group?.id;

    // Verificar que el creador es OWNER
    const membersRes = await request(`/groups/${createdGroupId}/members`);
    const ownerMember = membersRes.body.members?.find(m => m.member_role === 'OWNER');
    test('El creador del grupo recibe automáticamente el rol OWNER', !!ownerMember);

    // 5. SEGUNDO ESTUDIANTE SE UNE AL GRUPO (Rol MEMBER RN-09)
    const joinRes = await request(`/groups/${createdGroupId}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${newStudentToken}` }
    });
    test('Segundo estudiante se une exitosamente al grupo público (RN-09)', joinRes.ok && joinRes.body.membership_status === 'ACTIVE');

    // Verificar lista actualizada de miembros y roles
    const updatedMembersRes = await request(`/groups/${createdGroupId}/members`);
    test('Lista de integrantes refleja 2 miembros activos con sus respectivos roles', updatedMembersRes.body.members?.length === 2);

    // 6. CREACIÓN Y GESTIÓN DE TAREAS GRUPALES
    const createTaskRes = await request(`/groups/${createdGroupId}/tasks`, {
      method: 'POST',
      headers: demoHeaders,
      body: {
        title: 'Diseñar arquitectura offline con IndexedDB',
        description: 'Crear almacén Dexie para credenciales y recursos.',
        assigned_to: ownerMember.user_id,
        due_date: new Date(Date.now() + 86400000 * 4)
      }
    });
    test('Creación de tarea grupal asignada responde HTTP 201', createTaskRes.status === 201 && !!createTaskRes.body.task?.id);
    const taskId = createTaskRes.body.task?.id;
    test('Tarea inicializada con estado TODO', createTaskRes.body.task?.status === 'TODO');

    // 7. TRANSICIÓN DE ESTADO DE LA TAREA (TODO -> IN_PROGRESS -> DONE)
    const updateProgressRes = await request(`/groups/${createdGroupId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: demoHeaders,
      body: { status: 'IN_PROGRESS' }
    });
    test('Transición de tarea a IN_PROGRESS exitosa', updateProgressRes.body.task?.status === 'IN_PROGRESS');

    const updateDoneRes = await request(`/groups/${createdGroupId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: demoHeaders,
      body: { status: 'DONE' }
    });
    test('Transición de tarea a DONE (Completada) exitosa', updateDoneRes.body.task?.status === 'DONE');

    // 8. LISTADO DE TAREAS DEL GRUPO
    const listTasksRes = await request(`/groups/${createdGroupId}/tasks`, {
      headers: demoHeaders
    });
    test('Listado de tareas grupales retorna tarea completada con metadatos de asignación', listTasksRes.body.tasks?.length >= 1 && listTasksRes.body.tasks[0].status === 'DONE');

  } catch (err) {
    console.error('Error fatal durante la prueba E2E:', err);
    failed++;
  } finally {
    server.close();
    console.log('\n============================================================');
    console.log(`📊 RESULTADOS: ${passed} pasadas, ${failed} fallidas.`);
    console.log('============================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
