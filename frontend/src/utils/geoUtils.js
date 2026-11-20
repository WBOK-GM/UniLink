/**
 * UniLink Geolocation & Sensor Utilities
 * Implementa geolocalización resiliente de 2 etapas (alta precisión -> baja precisión/caché)
 * con fallback inteligente para el campus universitario UPTC Tunja cuando el hardware GPS
 * está ausente o el servicio del sistema operativo (GeoClue/Linux/Chrome) está deshabilitado.
 */

// Lugares universitarios de referencia real UPTC Sede Central Tunja
export const UPTC_CAMPUS_PRESETS = [
  {
    id: 'ingenieria',
    name: 'Facultad de Ingeniería (Aulas 302 / Sistemas)',
    shortName: 'Facultad de Ingeniería',
    lat: 5.5525,
    lng: -73.3553,
    description: 'Edificio de Ingeniería de Sistemas y Computación, Aulas y Auditorio'
  },
  {
    id: 'biblioteca',
    name: 'Biblioteca Central Jorge Palacios Preciado',
    shortName: 'Biblioteca Central',
    lat: 5.5536,
    lng: -73.3581,
    description: 'Salas de lectura, hemeroteca y cubículos de estudio grupal'
  },
  {
    id: 'central',
    name: 'Edificio Central y Rectoría UPTC',
    shortName: 'Edificio Central',
    lat: 5.5530,
    lng: -73.3565,
    description: 'Sede administrativa, admisiones y aulas centrales'
  },
  {
    id: 'cti',
    name: 'Laboratorios de Ingeniería y CTI',
    shortName: 'Laboratorios CTI',
    lat: 5.5520,
    lng: -73.3548,
    description: 'Centro de Tecnología e Innovación, laboratorios de electrónica y redes'
  },
  {
    id: 'camilo_torres',
    name: 'Plaza Camilo Torres / Canchas Deportivas',
    shortName: 'Plaza Camilo Torres',
    lat: 5.5540,
    lng: -73.3570,
    description: 'Área deportiva, plazoleta cívica y zonas verdes de integración'
  },
  {
    id: 'restaurante',
    name: 'Restaurante Central y Cafetería',
    shortName: 'Restaurante Central',
    lat: 5.5532,
    lng: -73.3575,
    description: 'Bienestar universitario y zona de alimentación estudiantil'
  }
];

export const DEFAULT_CAMPUS_LOCATION = {
  lat: 5.5525,
  lng: -73.3553,
  placeName: 'Facultad de Ingeniería (UPTC Tunja)',
  isFallback: true
};

/**
 * Fórmula de Haversine para calcular distancia en kilómetros entre dos coordenadas
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  const R = 6371; // Radio de la Tierra en km
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

/**
 * Encuentra el preset de UPTC más cercano a unas coordenadas dadas
 */
export function findNearestCampusPreset(lat, lng) {
  let nearest = UPTC_CAMPUS_PRESETS[0];
  let minDistance = Infinity;

  UPTC_CAMPUS_PRESETS.forEach((preset) => {
    const dist = calculateDistanceKm(lat, lng, preset.lat, preset.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = preset;
    }
  });

  return { ...nearest, distanceKm: minDistance };
}

/**
 * Obtiene la ubicación del dispositivo con estrategia resiliente de múltiples etapas:
 * 1. Intento de alta precisión (GPS de hardware / chip móvil) con timeout de 5 segundos.
 * 2. Si falla o expira, intento de baja precisión (WiFi / Celular / IP) con caché permitido de 5 minutos.
 * 3. Si el sistema operativo no tiene GPS físico o el servicio de ubicación del SO está inactivo
 *    (ej. Linux Chromium reportando "User denied Geolocation"), retorna gracefully el punto
 *    de referencia de la UPTC sin alertas bloqueantes.
 *
 * @param {Object} options Opciones adicionales
 * @returns {Promise<{
 *   lat: number,
 *   lng: number,
 *   placeName: string,
 *   accuracy: number | null,
 *   isRealGps: boolean,
 *   source: 'GPS_HARDWARE' | 'NETWORK_APPROX' | 'CAMPUS_FALLBACK',
 *   errorNotice?: string
 * }>}
 */
export async function getResilientPosition(options = {}) {
  // Caso 1: Navegador sin soporte de API Geolocation
  if (!('geolocation' in navigator)) {
    return {
      lat: DEFAULT_CAMPUS_LOCATION.lat,
      lng: DEFAULT_CAMPUS_LOCATION.lng,
      placeName: DEFAULT_CAMPUS_LOCATION.placeName,
      accuracy: null,
      isRealGps: false,
      source: 'CAMPUS_FALLBACK',
      errorNotice: 'Tu navegador no soporta la API de geolocalización. Se activó el campus UPTC Tunja.'
    };
  }

  // Helper para envolver getCurrentPosition en Promise
  const queryGps = (gpsOptions) => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, gpsOptions);
    });
  };

  // Etapa 1: Intentar alta precisión con timeout moderado (5 segundos)
  try {
    const pos = await queryGps({
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 30000
    });

    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      placeName: `Ubicación GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
      accuracy: Math.round(pos.coords.accuracy || 10),
      isRealGps: true,
      source: 'GPS_HARDWARE'
    };
  } catch (errHigh) {
    console.warn('[UniLink Geolocation] Alta precisión no disponible, reintentando baja precisión:', errHigh.message);
  }

  // Etapa 2: Intentar baja precisión con tolerancia de caché amplia (5 minutos)
  try {
    const posLow = await queryGps({
      enableHighAccuracy: false,
      timeout: 6000,
      maximumAge: 300000
    });

    return {
      lat: posLow.coords.latitude,
      lng: posLow.coords.longitude,
      placeName: `Ubicación aproximada (${posLow.coords.latitude.toFixed(4)}, ${posLow.coords.longitude.toFixed(4)})`,
      accuracy: Math.round(posLow.coords.accuracy || 50),
      isRealGps: true,
      source: 'NETWORK_APPROX'
    };
  } catch (errLow) {
    console.warn('[UniLink Geolocation] Ubicación del sistema/hardware no disponible:', errLow.message);
  }

  // Etapa 3: Fallback controlado al campus universitario UPTC Tunja
  // Ocurre típicamente en Linux/Chromium en escritorio sin chip GPS o con GeoClue apagado
  const preset = options.presetId
    ? UPTC_CAMPUS_PRESETS.find(p => p.id === options.presetId) || UPTC_CAMPUS_PRESETS[0]
    : UPTC_CAMPUS_PRESETS[0];

  return {
    lat: preset.lat,
    lng: preset.lng,
    placeName: preset.name,
    accuracy: 25,
    isRealGps: false,
    source: 'CAMPUS_FALLBACK',
    errorNotice: 'El equipo no cuenta con chip GPS activo o el servicio de ubicación del sistema está deshabilitado. Se asignó automáticamente el campus UPTC Tunja.'
  };
}

/**
 * Diagnóstico rápido del estado de los sensores del navegador
 */
export async function checkSensorPermissions() {
  const result = {
    geolocation: { state: 'unknown', supported: 'geolocation' in navigator },
    camera: { state: 'unknown', supported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) },
    microphone: { state: 'unknown', supported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) },
    vibration: { supported: 'vibrate' in navigator }
  };

  if ('permissions' in navigator && navigator.permissions.query) {
    try {
      const geoPerm = await navigator.permissions.query({ name: 'geolocation' });
      result.geolocation.state = geoPerm.state; // 'granted' | 'prompt' | 'denied'
    } catch (e) {}

    try {
      const camPerm = await navigator.permissions.query({ name: 'camera' });
      result.camera.state = camPerm.state;
    } catch (e) {}

    try {
      const micPerm = await navigator.permissions.query({ name: 'microphone' });
      result.microphone.state = micPerm.state;
    } catch (e) {}
  }

  return result;
}
