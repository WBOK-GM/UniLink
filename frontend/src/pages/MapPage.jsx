import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Compass, MapPin, Users, Lock, Unlock, Navigation, Filter, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function MapPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [radiusKm, setRadiusKm] = useState(15);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [userCoords, setUserCoords] = useState({ lat: 4.60971, lng: -74.08175 }); // Coordenadas de referencia

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

  // Obtener geolocalización real si está permitida
  const handleGetDeviceLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(newCoords);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([newCoords.lat, newCoords.lng], 14);
          }
          fetchGroups(newCoords.lat, newCoords.lng, radiusKm);
        },
        (err) => {
          alert('No se pudo obtener la ubicación GPS: ' + err.message);
        }
      );
    }
  };

  useEffect(() => {
    fetchGroups(userCoords.lat, userCoords.lng, radiusKm);
  }, [radiusKm]);

  // Actualizar marcadores en el mapa cuando cambian los grupos
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // Marcador de ubicación del usuario (Punto de referencia privado)
    const userIcon = L.divIcon({
      className: 'user-pin',
      html: `<div style="background-color: #6366f1; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(99,102,241,0.8);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
      .addTo(markersLayerRef.current)
      .bindPopup('<b style="color:#6366f1;">📍 Tu Punto de Referencia</b><br><span style="font-size:11px;color:#94a3b8;">Ubicación privada usada para calcular distancias.</span>');

    // Marcadores de grupos de estudio
    groups.forEach((group) => {
      if (!group.location?.latitude || !group.location?.longitude) return;

      const isPublic = group.group_type === 'PUBLIC';
      const color = isPublic ? '#10b981' : '#a855f7';

      const groupIcon = L.divIcon({
        className: 'custom-group-pin',
        html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); border: 2px solid white;">👥</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([group.location.latitude, group.location.longitude], { icon: groupIcon })
        .addTo(markersLayerRef.current);

      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 180px;">
          <h4 style="font-weight: bold; margin-bottom: 4px; color: #f8fafc; font-size: 14px;">${group.name}</h4>
          <span style="font-size: 11px; background: ${color}20; color: ${color}; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
            ${isPublic ? 'Público (Acceso libre)' : 'Privado (Requiere aprobación)'}
          </span>
          <p style="font-size: 12px; color: #cbd5e1; margin: 8px 0;">${group.description || 'Sin descripción'}</p>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
            📍 Distancia: <b>${group.distance_km !== null ? `${group.distance_km} km` : 'Calculando...'}</b><br>
            👥 Integrantes: <b>${group.members_count}</b>
          </div>
          <a href="/groups" style="display: block; text-align: center; background: #4f46e5; color: white; padding: 6px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none;">
            Ver Grupo
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-4">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Explorador Geográfico de Grupos</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Descubre grupos de estudio presenciales organizados por distancia (Fórmula Haversine).
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          {/* Radius selector */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-sm">
            <Filter className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
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
            className="px-3.5 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-600/20 hover:bg-brand-100 dark:hover:bg-brand-600/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title="Centrar en mi ubicación actual"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Mi GPS</span>
          </button>
        </div>
      </div>

      {/* Map + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[580px]">
        {/* Leaflet Map Box */}
        <div className="lg:col-span-2 h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md relative">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Groups List Sidebar */}
        <div className="h-full glass-panel rounded-2xl border border-slate-200/90 dark:border-slate-800/80 p-4 flex flex-col shadow-sm">
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
    </div>
  );
}
