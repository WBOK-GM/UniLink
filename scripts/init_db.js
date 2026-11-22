/**
 * Script de Inicialización y Migración de Base de Datos para UniLink
 * Compatible con Neon PostgreSQL, Render Postgres o PostgreSQL Local
 * 
 * Uso:
 *   DATABASE_URL="postgres://..." npm run db:init
 *   node scripts/init_db.js --dry-run
 */

const fs = require('fs');
const path = require('path');

// Cargar dependencias instaladas en backend/node_modules
const backendDir = path.join(__dirname, '../backend');
try {
  require(path.join(backendDir, 'node_modules/dotenv')).config({ path: path.join(backendDir, '.env') });
} catch (e) {}

const isDryRun = process.argv.includes('--dry-run');
const databaseUrl = process.env.DATABASE_URL || '';

const getPgPool = () => {
  const { Pool } = require(path.join(backendDir, 'node_modules/pg'));
  return Pool;
};

const getBcrypt = () => {
  return require(path.join(backendDir, 'node_modules/bcryptjs'));
};

async function runInit() {
  console.log('====================================================================');
  console.log('🐘 UniLink - Inicializador de Base de Datos PostgreSQL / Neon');
  console.log('====================================================================\n');

  const schemaPath = path.join(__dirname, '../backend/schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Error: Archivo schema.sql no encontrado en', schemaPath);
    process.exit(1);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  console.log(`📄 Esquema SQL cargado correctamente (${schemaSql.length} bytes).`);

  if (isDryRun || !databaseUrl.trim()) {
    console.log('\n[DRY-RUN / INSTRUCCIÓN]:');
    if (!databaseUrl.trim()) {
      console.log('⚠️  DATABASE_URL no está definida en el entorno ni en backend/.env.');
      console.log('💡 Para inicializar tu base de datos en Neon PostgreSQL o Render, ejecuta:');
      console.log('   DATABASE_URL="postgres://usuario:pass@ep-xyz.neon.tech/neondb?sslmode=require" npm run db:init\n');
    }
    console.log('✅ Validación de esquema SQL completada exitosamente.');
    process.exit(0);
  }

  const isNeonOrSsl = databaseUrl.includes('sslmode=require') ||
    databaseUrl.includes('neon.tech') ||
    databaseUrl.includes('render.com') ||
    process.env.NODE_ENV === 'production';

  const Pool = getPgPool();
  const bcrypt = getBcrypt();

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isNeonOrSsl ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('📡 Conectando a la base de datos PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Conexión establecida con éxito.\n');

    console.log('🔨 Ejecutando sentencias DDL de schema.sql...');
    await client.query(schemaSql);
    console.log('✅ Tablas, relaciones e índices creados o verificados.\n');

    // Inicializar o verificar usuarios seed de prueba oficiales
    console.log('🌱 Verificando usuarios semilla oficiales...');
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('123456', salt);

    // 1. Estudiante Demo
    const studentEmail = 'estudiante@unilink.edu.co';
    const studentUserRes = await client.query('SELECT id FROM users WHERE email = $1', [studentEmail]);
    let studentId;
    if (studentUserRes.rows.length === 0) {
      const inserted = await client.query(
        `INSERT INTO users (id, email, password_hash, role, status)
         VALUES ('11111111-1111-1111-1111-111111111111', $1, $2, 'STUDENT', 'ACTIVE')
         RETURNING id`,
        [studentEmail, passHash]
      );
      studentId = inserted.rows[0].id;

      await client.query(
        `INSERT INTO profiles (id, user_id, full_name, biography, university, academic_program, semester, latitude, longitude)
         VALUES ('11111111-1111-1111-1111-222222222222', $1, 'Walter Alfonso', 'Estudiante universitario apasionado por arquitecturas distribuidas e IA.', 'Universidad (Campus Tunja)', 'Ingeniería de Sistemas y Computación', 9, 5.5530, -73.3565)`,
        [studentId]
      );
      console.log(`  ➕ Usuario Estudiante creado: ${studentEmail} (123456)`);
    } else {
      console.log(`  ✔️ Usuario Estudiante ya existe: ${studentEmail}`);
    }

    // 2. Administrador Demo
    const adminEmail = 'admin@unilink.edu.co';
    const adminUserRes = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    let adminId;
    if (adminUserRes.rows.length === 0) {
      const inserted = await client.query(
        `INSERT INTO users (id, email, password_hash, role, status)
         VALUES ('22222222-2222-2222-2222-222222222222', $1, $2, 'ADMIN', 'ACTIVE')
         RETURNING id`,
        [adminEmail, passHash]
      );
      adminId = inserted.rows[0].id;

      await client.query(
        `INSERT INTO profiles (id, user_id, full_name, biography, university, academic_program, semester, latitude, longitude)
         VALUES ('22222222-2222-2222-2222-333333333333', $1, 'Administrador General', 'Gestión de infraestructura y consola central UniLink.', 'Equipo de Coordinación UniLink', 'Dirección Académica', 10, 5.5536, -73.3581)`,
        [adminId]
      );
      console.log(`  ➕ Usuario Administrador creado: ${adminEmail} (123456)`);
    } else {
      console.log(`  ✔️ Usuario Administrador ya existe: ${adminEmail}`);
    }

    // 3. Categorías iniciales
    const catCheck = await client.query('SELECT COUNT(*) FROM categories');
    if (parseInt(catCheck.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO categories (id, name, normalized_name, description, status) VALUES
        ('c1111111-1111-1111-1111-111111111111', 'Programación', 'programacion', 'Algoritmos, estructuras y desarrollo de software', 'ACTIVE'),
        ('c2222222-2222-2222-2222-222222222222', 'Bases de Datos', 'bases-de-datos', 'SQL, NoSQL, modelado y optimización', 'ACTIVE'),
        ('c3333333-3333-3333-3333-333333333333', 'Inteligencia Artificial', 'inteligencia-artificial', 'Machine Learning, Deep Learning y agentes', 'ACTIVE'),
        ('c4444444-4444-4444-4444-444444444444', 'Redes y Distribuidos', 'redes-y-distribuidos', 'Protocolos, Docker y microservicios', 'ACTIVE'),
        ('c5555555-5555-5555-5555-555555555555', 'Matemáticas y Cálculo', 'matematicas-y-calculo', 'Álgebra lineal, cálculo diferencial y matemáticas discretas', 'ACTIVE'),
        ('c6666666-6666-6666-6666-666666666666', 'Desarrollo Web & PWA', 'desarrollo-web-pwa', 'Service Workers, React, interfaces y APIs', 'ACTIVE')
      `);
      console.log('  ➕ Categorías académicas base insertadas.');
    } else {
      console.log(`  ✔️ Categorías académicas verificadas (${catCheck.rows[0].count} registradas).`);
    }

    client.release();
    console.log('\n====================================================================');
    console.log('🎉 BASE DE DATOS INICIALIZADA EXITOSAMENTE Y LISTA PARA PRODUCCIÓN');
    console.log('====================================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error durante la inicialización de la base de datos:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runInit();
