import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, X, Check, Search, Building2, BookOpen, Coffee, Compass } from 'lucide-react';

export default function LocationPickerModal({
  isOpen,
  onClose,
  initialCoords = { lat: 5.5530, lng: -73.3565 },
  initialPlaceName = '',
  onSelectLocation
}) {
  const [selectedCoords, setSelectedCoords] = useState(initialCoords);
  const [placeName, setPlaceName] = useState(initialPlaceName);
  const [locating, setLocating] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Lugares universitarios de referencia real UPTC Tunja
  const campusPresets = [
    { name: 'Biblioteca Central (Jorge Palacios Preciado)', lat: 5.5536, lng: -73.3581, icon: BookOpen },
    { name: 'Facultad de Ingeniería (Aulas 302 / Sistemas)', lat: 5.5525, lng: -73.3553, icon: Building2 },
    { name: 'Edificio Central y Rectoría', lat: 5.5530, lng: -73.3565, icon: Building2 },
    { name: 'Laboratorios de Ingeniería y CTI', lat: 5.5520, lng: -73.3548, icon: Compass },
    { name: 'Plaza Camilo Torres / Canchas', lat: 5.5540, lng: -73.3570, icon: MapPin },
    { name: 'Restaurante y Cafetería Central', lat: 5.5532, lng: -73.3575, icon: Coffee },
  ];

  // Crear icono de marcador personalizado de alta estética
  const createPinIcon = () => {
    return L.divIcon({
      className: 'unilink-picker-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.5); border: 2.5px solid #ffffff;">
            <span style="transform: rotate(45deg); font-size: 15px;">📍</span>
          </div>
          <div style="width: 14px; height: 5px; background: rgba(0,0,0,0.3); border-radius: 50%; margin-top: 3px; filter: blur(1.5px);"></div>
        </div>
      `,
      iconSize: [36, 44],
      iconAnchor: [18, 42]
    });
  };

  // Inicializar o re-centrar el mapa al abrir el modal
  useEffect(() => {
    if (!isOpen) return;

    // Resetear coordenadas iniciales si se pasan
    if (initialCoords && initialCoords.lat && initialCoords.lng) {
      setSelectedCoords(initialCoords);
    }
    if (initialPlaceName) {
      setPlaceName(initialPlaceName);
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      const targetLat = initialCoords?.lat || 5.5530;
      const targetLng = initialCoords?.lng || -73.3565;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: true
        }).setView([targetLat, targetLng], 16);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors | UPTC Tunja'
        }).addTo(map);

        // Añadir marcador inicial
        const marker = L.marker([targetLat, targetLng], {
          icon: createPinIcon(),
          draggable: true
        }).addTo(map);

        // Evento arrastrar marcador
        marker.on('dragend', (e) => {
          const pos = e.target.getLatLng();
          setSelectedCoords({ lat: pos.lat, lng: pos.lng });
        });

        markerRef.current = marker;

        // Evento clic en cualquier punto del mapa para colocar/mover el marcador
        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          setSelectedCoords({ lat, lng });
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng], {
              icon: createPinIcon(),
              draggable: true
            }).addTo(map);
          }
        });

        mapInstanceRef.current = map;
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([targetLat, targetLng], 15);
        if (markerRef.current) {
          markerRef.current.setLatLng([targetLat, targetLng]);
        }
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Limpiar instancia al desmontar
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Seleccionar preset rápido
  const handleSelectPreset = (preset) => {
    setPlaceName(preset.name);
    setSelectedCoords({ lat: preset.lat, lng: preset.lng });

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([preset.lat, preset.lng], 16);
      if (markerRef.current) {
        markerRef.current.setLatLng([preset.lat, preset.lng]);
      }
    }
  };

  // Obtener GPS del dispositivo
  const handleGetDeviceLocation = () => {
    if (!('geolocation' in navigator)) {
      alert('Tu dispositivo o navegador no soporta geolocalización GPS.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setSelectedCoords(coords);
        if (!placeName) {
          setPlaceName('Mi ubicación GPS actual');
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([coords.lat, coords.lng], 16);
          if (markerRef.current) {
            markerRef.current.setLatLng([coords.lat, coords.lng]);
          }
        }
        setLocating(false);
      },
      (err) => {
        alert('No se pudo obtener el GPS: ' + err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Confirmar selección y devolver al padre
  const handleConfirm = () => {
    onSelectLocation({
      latitude: selectedCoords.lat,
      longitude: selectedCoords.lng,
      placeName: placeName.trim(),
      formatted: placeName.trim()
        ? `${placeName.trim()} (${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)})`
        : `Ubicación (${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)})`
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Seleccionar Ubicación en el Mapa
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Haz clic en el mapa o usa el GPS para asociar un lugar a este recurso.
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

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Location Reference Name input & GPS Button */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="Nombre o referencia del lugar (ej: Biblioteca piso 2, CTI...)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 shadow-xs transition"
              />
            </div>
            <button
              type="button"
              onClick={handleGetDeviceLocation}
              disabled={locating}
              className="px-3.5 py-2.5 rounded-xl bg-brand-50 dark:bg-brand-600/20 hover:bg-brand-100 dark:hover:bg-brand-600/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition shrink-0 shadow-xs"
            >
              <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Buscando GPS...' : 'Usar mi GPS actual'}</span>
            </button>
          </div>

          {/* Quick presets buttons */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
              Lugares comunes del campus UPTC Tunja:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {campusPresets.map((preset, idx) => {
                const IconComponent = preset.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800/80 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-slate-700 dark:text-slate-300 hover:text-brand-700 dark:hover:text-brand-300 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 flex items-center gap-1.5 transition"
                  >
                    <IconComponent className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Leaflet Map Canvas */}
          <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
            <div
              ref={mapContainerRef}
              className="w-full h-64 sm:h-72 bg-slate-100 dark:bg-slate-950 z-10"
            />
            {/* Guide badge overlaid */}
            <div className="absolute bottom-2.5 left-2.5 z-20 pointer-events-none bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-md text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>💡</span>
              <span>Haz clic o arrastra el marcador para fijar la ubicación exacta.</span>
            </div>
          </div>

          {/* Coordinates Bar */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Coordenadas:</span>
              <code className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-brand-600 dark:text-brand-400">
                {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
              </code>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Marcador fijado</span>
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/25 flex items-center gap-2 transition hover:scale-[1.01] active:scale-[0.99]"
          >
            <Check className="w-4 h-4" />
            <span>Confirmar Ubicación</span>
          </button>
        </div>
      </div>
    </div>
  );
}
