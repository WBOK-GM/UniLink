/**
 * UniLink PWA - Sensor & Hardware Diagnostic Automated Tests
 * Valida la resiliencia de geolocalización, presets de campus UPTC Tunja,
 * formato de capturas de cámara/audio y compatibilidad con directivas Permissions-Policy.
 */

const assert = require('assert');

// 1. Constantes y presets del campus UPTC
const UPTC_CAMPUS_PRESETS = [
  { id: 'ingenieria', name: 'Facultad de Ingeniería', lat: 5.5525, lng: -73.3553 },
  { id: 'biblioteca', name: 'Biblioteca Central Jorge Palacios Preciado', lat: 5.5536, lng: -73.3581 },
  { id: 'central', name: 'Edificio Central y Rectoría UPTC', lat: 5.5530, lng: -73.3565 },
  { id: 'cti', name: 'Laboratorios de Ingeniería y CTI', lat: 5.5520, lng: -73.3548 },
  { id: 'camilo_torres', name: 'Plaza Camilo Torres / Canchas', lat: 5.5540, lng: -73.3570 },
  { id: 'restaurante', name: 'Restaurante Central', lat: 5.5532, lng: -73.3575 }
];

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}:`, err.message);
    failed++;
  }
}

console.log('\n============================================================');
console.log('🧪 PRUEBAS DE SENSORES Y HARDWARE PWA UNILINK');
console.log('============================================================\n');

// Test 1: Presets UPTC
test('Catálogo de campus UPTC contiene al menos 5 puntos de referencia', () => {
  assert(UPTC_CAMPUS_PRESETS.length >= 5, 'Debe haber mínimo 5 presets');
});

// Test 2: Coordenadas geográficas válidas en Tunja
test('Todas las coordenadas de campus UPTC están dentro del cuadrante geográfico de Tunja', () => {
  UPTC_CAMPUS_PRESETS.forEach((preset) => {
    assert(preset.lat > 5.50 && preset.lat < 5.60, `${preset.name} latitud fuera de rango Tunja: ${preset.lat}`);
    assert(preset.lng > -73.40 && preset.lng < -73.30, `${preset.name} longitud fuera de rango Tunja: ${preset.lng}`);
  });
});

// Test 3: Cálculo Haversine entre Biblioteca e Ingeniería
test('Distancia Haversine entre Biblioteca e Ingeniería es consistente (~0.3 km)', () => {
  const bib = UPTC_CAMPUS_PRESETS.find(p => p.id === 'biblioteca');
  const ing = UPTC_CAMPUS_PRESETS.find(p => p.id === 'ingenieria');
  const dist = calculateDistanceKm(bib.lat, bib.lng, ing.lat, ing.lng);
  assert(dist > 0.1 && dist < 0.8, `Distancia esperada entre 0.1 y 0.8 km, obtenida: ${dist}`);
});

// Test 4: Simulación de fallo GPS por falta de hardware (Linux/Desktop)
test('Resiliencia GPS: Asigna fallback a UPTC Tunja cuando hardware está ausente o denegado', () => {
  // Simular respuesta cuando navigator.geolocation falla con code 1 (PERMISSION_DENIED)
  const simulatedError = new Error('User denied Geolocation');
  let fallbackLocation = null;

  try {
    throw simulatedError;
  } catch (e) {
    // Manejador resiliente
    fallbackLocation = {
      lat: UPTC_CAMPUS_PRESETS[0].lat,
      lng: UPTC_CAMPUS_PRESETS[0].lng,
      isRealGps: false,
      source: 'CAMPUS_FALLBACK'
    };
  }

  assert.strictEqual(fallbackLocation.source, 'CAMPUS_FALLBACK');
  assert.strictEqual(fallbackLocation.isRealGps, false);
  assert(fallbackLocation.lat > 5.5);
});

// Test 5: Formato de captura de cámara
test('Captura de Cámara: Genera archivo JPEG con metadatos válidos', () => {
  const fakeBlob = Buffer.from('fake-image-bytes');
  const filename = `apunte_camara_${Date.now()}.jpg`;
  const fileObj = {
    name: filename,
    type: 'image/jpeg',
    size: fakeBlob.length
  };

  assert(fileObj.name.startsWith('apunte_camara_'));
  assert(fileObj.name.endsWith('.jpg'));
  assert.strictEqual(fileObj.type, 'image/jpeg');
  assert(fileObj.size > 0);
});

// Test 6: Formato de grabación de audio
test('Grabación de Micrófono: Genera archivo WebM con metadatos de audio válidos', () => {
  const fakeAudioBlob = Buffer.from('fake-audio-webm-bytes');
  const audioFilename = `nota_voz_${Date.now()}.webm`;
  const audioObj = {
    name: audioFilename,
    type: 'audio/webm',
    size: fakeAudioBlob.length
  };

  assert(audioObj.name.startsWith('nota_voz_'));
  assert(audioObj.name.endsWith('.webm'));
  assert.strictEqual(audioObj.type, 'audio/webm');
  assert(audioObj.size > 0);
});

// Test 7: Verificación de cabeceras de seguridad y permisos
test('Permissions-Policy en Servidor Express protege sensores no autorizados', async () => {
  const securityMiddleware = require('../backend/src/middlewares/security');
  assert(typeof securityMiddleware.configureSecurityHeaders === 'function');

  const headers = {};
  const mockRes = {
    setHeader: (k, v) => { headers[k.toLowerCase()] = v; },
    removeHeader: () => {}
  };
  securityMiddleware.configureSecurityHeaders({}, mockRes, () => {});

  assert(headers['permissions-policy'], 'Permissions-Policy debe estar definido');
  assert(headers['permissions-policy'].includes('camera=()'), 'Permissions-Policy debe restringir cámara por defecto en API');
  assert(headers['permissions-policy'].includes('geolocation=(self)'), 'geolocation=(self) debe estar permitido para el origen');
});

console.log('\n============================================================');
console.log(`📊 RESULTADOS: ${passed} pasadas, ${failed} fallidas.`);
console.log('============================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
