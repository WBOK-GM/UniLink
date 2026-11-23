import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import {
  Compass,
  MapPin,
  Users,
  Lock,
  Unlock,
  Navigation,
  Filter,
  ArrowRight,
  ArrowLeft,
  Activity,
  Building2,
  AlertCircle,
  X,
  Info,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getResilientPosition, UPTC_CAMPUS_PRESETS } from '../utils/geoUtils';
import SensorDiagnosticsModal from '../components/SensorDiagnosticsModal';

export default function MapPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [radiusKm, setRadiusKm] = useState(15);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedPresetId, setSelectedPresetId] = useState('central');
  const [userCoords, setUserCoords] = useState({ lat: 5.5530, lng: -73.3565 }); // Campus Sede Central Tunja
  const [isLocating, setIsLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState(null);
  const [sensorModalOpen, setSensorModalOpen] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  // Cargar grupos desde la API con distancia
  const fetchGroups = async (lat, lng, radius) => {
    try {
      setLoading(true);
      const res = await api.getGroups(`lat=${lat}&lng=${lng}&radius_km=${radius}`);
      if (res.success && res.groups) {
        setGroups(res.groups);
      }
    } catch (e) {
      console.warn('Error cargando grupos en mapa:', e);
    } finally {
      setLoading(false);
    }
  };

  // Inicializar Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true
      }).setView([userCoords.lat, userCoords.lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Cambiar punto de referencia del campus mediante el selector
  const handlePresetChange = (presetId) => {
    const preset = UPTC_CAMPUS_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPresetId(presetId);
      const newCoords = { lat: preset.lat, lng: preset.lng };
      setUserCoords(newCoords);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([preset.lat, preset.lng], 15);
      }
      fetchGroups(preset.lat, preset.lng, radiusKm);
      setLocationNotice({
        type: 'info',
        text: `Punto de referencia actualizado: ${preset.name}`
      });
    }
  };

  // Obtener geolocalización real si está permitida con fallback resiliente
  const handleGetDeviceLocation = async () => {
    setIsLocating(true);
    setLocationNotice(null);

    try {
      const result = await getResilientPosition({ presetId: selectedPresetId });
      const newCoords = { lat: result.lat, lng: result.lng };
      setUserCoords(newCoords);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([newCoords.lat, newCoords.lng], 15);
      }

      fetchGroups(newCoords.lat, newCoords.lng, radiusKm);

      if (result.isRealGps) {
        setLocationNotice({
          type: 'success',
          text: `GPS conectado: ${result.placeName} (Precisión ~${result.accuracy}m)`
        });
      } else {
        setLocationNotice({
          type: 'warning',
          text: result.errorNotice || 'GPS físico no detectado en el equipo. Ubicación centrada en campus universitario.'
        });
      }
    } catch (err) {
      setLocationNotice({
        type: 'warning',
        text: 'No se pudo acceder al GPS físico. Mostrando campus universitario.'
      });
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    fetchGroups(userCoords.lat, userCoords.lng, radiusKm);
  }, [radiusKm]);

  // Actualizar marcadores en el mapa cuando cambian los grupos
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // Marcador de ubicación del usuario (Punto de referencia privado) con SVG nativo
    const userIcon = L.divIcon({
      className: 'user-pin',
      html: `
        <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: #6366f1; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 14px; height: 14px; border-radius: 50%; background: #4f46e5; border: 3px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35); z-index: 2;"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });

    L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
      .addTo(markersLayerRef.current)
      .bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 180px; padding: 2px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="shrink-0;">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <b style="color: #0f172a; font-size: 13px; font-weight: 800;">Tu Punto de Referencia</b>
          </div>
          <span style="font-size: 11px; color: #475569; line-height: 1.4; display: block;">Ubicación privada utilizada para calcular distancias en el campus universitario.</span>
        </div>
      `);

    // Marcadores de grupos de estudio con SVG vectorial nativo
    groups.forEach((group) => {
      if (!group.location?.latitude || !group.location?.longitude) return;

      const isPublic = group.group_type === 'PUBLIC';
      const color = isPublic ? '#10b981' : '#8b5cf6';
      const badgeBg = isPublic ? '#ecfdf5' : '#fdf4ff';
      const badgeColor = isPublic ? '#047857' : '#7e22ce';
      const badgeBorder = isPublic ? '#a7f3d0' : '#f0abfc';
      const badgeText = isPublic ? 'Público (Acceso libre)' : 'Privado (Requiere aprobación)';

      const groupIcon = L.divIcon({
        className: 'custom-group-pin',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25)); cursor: pointer;">
            <div style="background: ${color}; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; border: 2.5px solid #ffffff;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid ${color}; margin-top: -1px;"></div>
          </div>
        `,
        iconSize: [34, 40],
        iconAnchor: [17, 39],
        popupAnchor: [0, -36]
      });

      const marker = L.marker([group.location.latitude, group.location.longitude], { icon: groupIcon })
        .addTo(markersLayerRef.current);

      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 210px; max-width: 250px; padding: 2px;">
          <h4 style="font-weight: 800; margin-bottom: 6px; color: #0f172a; font-size: 14px; line-height: 1.3;">
            ${group.name}
          </h4>
          
          <div style="margin-bottom: 8px;">
            <span style="font-size: 11px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; padding: 2px 8px; border-radius: 6px; font-weight: 700; display: inline-block;">
              ${badgeText}
            </span>
          </div>

          <p style="font-size: 12px; color: #334155; margin: 0 0 10px 0; line-height: 1.45;">
            ${group.description || 'Grupo académico de la comunidad universitaria.'}
          </p>

          <div style="font-size: 11.5px; color: #475569; margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span>Distancia: <b style="color: #0f172a;">${group.distance_km !== null ? `${group.distance_km} km` : 'Calculando...'}</b></span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>Integrantes: <b style="color: #0f172a;">${group.members_count}</b></span>
            </div>
          </div>

          <a href="/groups" style="display: flex; align-items: center; justify-content: center; gap: 6px; background: #4f46e5; color: #ffffff; padding: 8px 12px; border-radius: 10px; font-size: 12px; font-weight: 700; text-decoration: none; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.35);">
            <span>Ver Grupo</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </a>
        </div>
      `);

      marker.on('click', () => {
        setSelectedGroup(group);
      });
    });
  }, [groups, userCoords]);

  const handleGroupCardClick = (group) => {
    setSelectedGroup(group);
    if (mapInstanceRef.current && group.location) {
      mapInstanceRef.current.setView([group.location.latitude, group.location.longitude], 15);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-20">
      {/* Volver a Grupos (solo mobile) */}
      <Link
        to="/groups"
        className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs active:scale-95 transition"
      >
        <ArrowLeft className="w-4 h-4 text-brand-600 dark:text-brand-400" />
        <span>Volver a Grupos</span>
      </Link>

      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Explorador Geográfico de Grupos</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Descubre grupos de estudio presenciales organizados por distancia geográfica (Fórmula Haversine).
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          {/* Campus Landmark Quick Preset */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 font-medium hidden md:inline">Campus:</span>
            <select
              value={selectedPresetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-white font-bold focus:outline-none cursor-pointer text-xs"
              title="Cambiar punto de referencia en el campus"
            >
              {UPTC_CAMPUS_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {p.shortName}
                </option>
              ))}
            </select>
          </div>

          {/* Radius selector */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400">Radio:</span>
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="bg-transparent text-slate-800 dark:text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value={1} className="bg-white dark:bg-slate-900">1 km</option>
              <option value={5} className="bg-white dark:bg-slate-900">5 km</option>
              <option value={15} className="bg-white dark:bg-slate-900">15 km</option>
              <option value={30} className="bg-white dark:bg-slate-900">30 km</option>
              <option value={100} className="bg-white dark:bg-slate-900">Todos</option>
            </select>
          </div>

          {/* GPS button */}
          <button
            onClick={handleGetDeviceLocation}
            disabled={isLocating}
            className="px-3.5 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-600/20 hover:bg-brand-100 dark:hover:bg-brand-600/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title="Detectar ubicación GPS con fallback inteligente"
          >
            {isLocating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span>{isLocating ? 'Buscando...' : 'Mi GPS'}</span>
          </button>

          {/* Botón Diagnóstico de Sensores */}
          <button
            type="button"
            onClick={() => setSensorModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Diagnóstico de Sensores y Permisos Hardware"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden lg:inline">Diagnosticar Sensores</span>
          </button>
        </div>
      </div>

      {/* Banner de Aviso de Ubicación / Fallback GPS */}
      {locationNotice && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs shadow-xs animate-fadeIn ${
            locationNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-200'
              : locationNotice.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
              : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/40 text-indigo-900 dark:text-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Info className="w-4 h-4 shrink-0 text-brand-600 dark:text-brand-400" />
            <span className="truncate">{locationNotice.text}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSensorModalOpen(true)}
              className="text-[11px] underline font-bold hover:opacity-80"
            >
              Ver Sensores
            </button>
            <button
              type="button"
              onClick={() => setLocationNotice(null)}
              className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition"
              title="Cerrar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Map + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:h-[580px]">
        {/* Leaflet Map Box */}
        <div className="lg:col-span-2 h-[60vh] min-h-[400px] lg:h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md relative">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Groups List Sidebar */}
        <div className="lg:h-full glass-panel rounded-2xl border border-slate-200/90 dark:border-slate-800/80 p-4 flex flex-col shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Grupos en el radio ({groups.length})
            </span>
            <span className="text-[11px] text-slate-500">Ordenados por proximidad</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {groups.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No hay grupos en este radio de búsqueda. Aumenta el radio para explorar más.
              </div>
            ) : (
              groups.map((g) => {
                const isSelected = selectedGroup?.id === g.id;
                const isPublic = g.group_type === 'PUBLIC';

                return (
                  <div
                    key={g.id}
                    onClick={() => handleGroupCardClick(g)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-500/15 border-brand-300 dark:border-brand-500/50 shadow-md'
                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 hover:border-brand-300 dark:hover:border-slate-700 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{g.name}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isPublic
                          ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30'
                      }`}>
                        {isPublic ? 'Público' : 'Privado'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                      {g.description || 'Sin descripción'}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                      <span className="flex items-center gap-1 text-brand-700 dark:text-brand-300 font-bold">
                        <MapPin className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                        {g.distance_km !== null ? `${g.distance_km} km` : 'Cerca'}
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Users className="w-3 h-3 text-slate-400" />
                        {g.members_count} miembros
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal de Diagnóstico de Sensores PWA */}
      <SensorDiagnosticsModal
        isOpen={sensorModalOpen}
        onClose={() => setSensorModalOpen(false)}
      />
    </div>
  );
}
