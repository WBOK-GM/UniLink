import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, X, ExternalLink, Navigation, Compass, Building2, CheckCircle2 } from 'lucide-react';

// Diccionario de referencias reales UPTC Sede Central Tunja (Boyacá, Colombia)
export const UPTC_LANDMARKS = {
  BIBLIOTECA: {
    name: 'Biblioteca Central Jorge Palacios Preciado (UPTC)',
    building: 'Biblioteca Central',
    campus: 'UPTC - Sede Central Tunja, Boyacá',
    lat: 5.5536,
    lng: -73.3581,
    altitude: '2.705 m s. n. m.'
  },
  INGENIERIA: {
    name: 'Facultad de Ingeniería (UPTC)',
    building: 'Edificio de Ingeniería',
    campus: 'UPTC - Sede Central Tunja, Boyacá',
    lat: 5.5525,
    lng: -73.3553,
    altitude: '2.698 m s. n. m.'
  },
  CENTRAL: {
    name: 'Edificio Central y Rectoría (UPTC)',
    building: 'Edificio Central / Administrativo',
    campus: 'UPTC - Sede Central Tunja, Boyacá',
    lat: 5.5530,
    lng: -73.3565,
    altitude: '2.700 m s. n. m.'
  },
  LABORATORIOS: {
    name: 'Laboratorios de Ciencias e Ingeniería (UPTC)',
    building: 'Edificio de Laboratorios y CTI',
    campus: 'UPTC - Sede Central Tunja, Boyacá',
    lat: 5.5520,
    lng: -73.3548,
    altitude: '2.695 m s. n. m.'
  },
  PLAZA: {
    name: 'Plaza Camilo Torres (UPTC)',
    building: 'Plaza Central y Zonas Deportivas',
    campus: 'UPTC - Sede Central Tunja, Boyacá',
    lat: 5.5540,
    lng: -73.3570,
    altitude: '2.702 m s. n. m.'
  },
  CAFETERIA: {
    name: 'Restaurante y Cafetería Central (UPTC)',
    building: 'Restaurante Universitario',
    campus: 'UPTC - Sede Central Tunja, Boyacá',
    lat: 5.5532,
    lng: -73.3575,
    altitude: '2.703 m s. n. m.'
  }
};

/**
 * Función auxiliar para resolver ubicación real UPTC a partir de cualquier texto o coordenadas
 */
export function resolveUptcLocation(locationStr) {
  if (!locationStr) {
    return {
      title: 'UPTC Sede Central',
      building: 'Campus Universitario UPTC',
      campus: 'Tunja, Boyacá, Colombia',
      lat: 5.5530,
      lng: -73.3565,
      altitude: '2.700 m s. n. m.'
    };
  }

  // 1. Verificar si incluye coordenadas explícitas (lat, lng)
  const coordsMatch = locationStr.match(/\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
  if (coordsMatch) {
    const lat = parseFloat(coordsMatch[1]);
    const lng = parseFloat(coordsMatch[2]);
    const rawTitle = locationStr.replace(/\(-?\d+\.\d+,\s*-?\d+\.\d+\)/, '').trim();
    return {
      title: rawTitle || 'Ubicación UPTC',
      building: rawTitle || 'Instalación UPTC',
      campus: 'UPTC - Sede Central Tunja, Boyacá',
      lat,
      lng,
      altitude: '2.700 m s. n. m.'
    };
  }

  // 2. Mapear por palabras clave de la UPTC
  const lower = locationStr.toLowerCase();
  if (lower.includes('biblioteca') || lower.includes('palacios')) {
    return { ...UPTC_LANDMARKS.BIBLIOTECA, title: locationStr };
  }
  if (lower.includes('ingenier') || lower.includes('302') || lower.includes('aula') || lower.includes('sistemas')) {
    return { ...UPTC_LANDMARKS.INGENIERIA, title: locationStr };
  }
  if (lower.includes('laboratorio') || lower.includes('cti') || lower.includes('taller')) {
    return { ...UPTC_LANDMARKS.LABORATORIOS, title: locationStr };
  }
  if (lower.includes('plaza') || lower.includes('camilo') || lower.includes('verde')) {
    return { ...UPTC_LANDMARKS.PLAZA, title: locationStr };
  }
  if (lower.includes('cafeter') || lower.includes('restaurante') || lower.includes('comedor')) {
    return { ...UPTC_LANDMARKS.CAFETERIA, title: locationStr };
  }

  // Fallback centrado en UPTC Sede Central
  return {
    title: locationStr,
    building: locationStr,
    campus: 'UPTC - Sede Central Tunja, Boyacá',
    lat: 5.5530,
    lng: -73.3565,
    altitude: '2.700 m s. n. m.'
  };
}

export default function LocationViewModal({ isOpen, onClose, locationStr }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const loc = resolveUptcLocation(locationStr);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      const pinIcon = L.divIcon({
        className: 'uptc-view-pin',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; width: 40px; height: 40px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(79, 70, 229, 0.6); border: 3px solid #ffffff;">
              <span style="transform: rotate(45deg); font-size: 18px;">📍</span>
            </div>
            <div style="width: 16px; height: 6px; background: rgba(0,0,0,0.3); border-radius: 50%; margin-top: 4px; filter: blur(2px);"></div>
          </div>
        `,
        iconSize: [40, 48],
        iconAnchor: [20, 46]
      });

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: true
        }).setView([loc.lat, loc.lng], 17);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors | UPTC Tunja'
        }).addTo(map);

        const marker = L.marker([loc.lat, loc.lng], { icon: pinIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; color: #0f172a;">
            <strong style="color: #4f46e5; font-size: 13px;">${loc.title}</strong><br>
            <span>${loc.campus}</span><br>
            <span style="color: #64748b; font-size: 11px;">Altitud: ${loc.altitude}</span>
          </div>
        `).openPopup();

        markerRef.current = marker;
        mapInstanceRef.current = map;
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([loc.lat, loc.lng], 17);
        if (markerRef.current) {
          markerRef.current.setLatLng([loc.lat, loc.lng]);
          markerRef.current.setPopupContent(`
            <div style="font-family: inherit; font-size: 12px; color: #0f172a;">
              <strong style="color: #4f46e5; font-size: 13px;">${loc.title}</strong><br>
              <span>${loc.campus}</span><br>
              <span style="color: #64748b; font-size: 11px;">Altitud: ${loc.altitude}</span>
            </div>
          `);
          markerRef.current.openPopup();
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen, loc.lat, loc.lng, loc.title]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  const googleMapsUrl = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {loc.title}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  UPTC Tunja
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {loc.campus}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Leaflet Map Frame */}
          <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
            <div
              ref={mapContainerRef}
              className="w-full h-72 sm:h-80 bg-slate-100 dark:bg-slate-950 z-10"
            />
            {/* Overlay badge with location summary */}
            <div className="absolute top-3 left-3 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-md text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Ubicación real UPTC Sede Central</span>
            </div>
          </div>

          {/* Details Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Coordenadas GPS</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Sede Universitaria</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                UPTC - Tunja (Boyacá)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Altitud oficial</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {loc.altitude}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-brand-700 dark:text-brand-300 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-1.5 transition"
          >
            <span>Abrir en Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/25 transition hover:scale-[1.01] active:scale-[0.99]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
