import React, { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  Bell,
  Shield,
  Navigation,
  Save,
  CheckCircle,
  Smartphone,
  ShieldCheck,
  Zap,
  GraduationCap,
  Sparkles,
  BookOpen,
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import AdminPortal from '../admin/AdminPortal';
import StorageManagerModal from '../components/StorageManagerModal';
import { getResilientPosition, UPTC_CAMPUS_PRESETS } from '../utils/geoUtils';

export default function ProfilePage() {
  const { user, updateUserProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [biography, setBiography] = useState('');
  const [university, setUniversity] = useState('');
  const [academicProgram, setAcademicProgram] = useState('');
  const [semester, setSemester] = useState(1);
  const [latitude, setLatitude] = useState(5.5530);
  const [longitude, setLongitude] = useState(-73.3565);
  const [saving, setSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState('DEFAULT');
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);

  useEffect(() => {
    if (user?.profile) {
      setFullName(user.profile.full_name || '');
      setBiography(user.profile.biography || '');
      setUniversity(user.profile.university || '');
      setAcademicProgram(user.profile.academic_program || '');
      setSemester(user.profile.semester || 1);
      if (user.profile.latitude !== undefined) setLatitude(user.profile.latitude);
      if (user.profile.longitude !== undefined) setLongitude(user.profile.longitude);
    }
  }, [user]);

  const handleGpsUpdate = async () => {
    try {
      const pos = await getResilientPosition();
      setLatitude(pos.lat);
      setLongitude(pos.lng);
      alert(`📍 Coordenadas actualizadas: ${pos.placeName}`);
    } catch (err) {
      alert('No se pudo acceder al GPS físico. Se mantiene el campus UPTC.');
    }
  };

  const handleSelectCampusPreset = (presetId) => {
    const preset = UPTC_CAMPUS_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setLatitude(preset.lat);
      setLongitude(preset.lng);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.updateProfile({
        full_name: fullName,
        biography,
        university,
        academic_program: academicProgram,
        semester: Number(semester),
        latitude: Number(latitude),
        longitude: Number(longitude)
      });

      if (res.success && res.profile) {
        updateUserProfile(res.profile);
        alert('✅ Perfil actualizado exitosamente.');
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Tu navegador no soporta la API de Web Push.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Permiso de notificaciones denegado.');
        setPushStatus('DENIED');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidRes = await api.getVapidPublicKey();
      const publicKey = vapidRes.publicKey;

      const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: outputArray
      });

      await api.subscribePush(subscription.toJSON());
      setPushStatus('SUBSCRIBED');
      alert('🔔 ¡Notificaciones push activadas exitosamente!');
    } catch (err) {
      console.error('Error suscribiendo push:', err);
      alert('Error al activar notificaciones: ' + err.message);
    }
  };

  const handleTestPush = async () => {
    try {
      const res = await api.testPush();
      alert(res.message);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      
      {/* Student Identity Card (Carnet Digital Universitario) */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-900 via-brand-800 to-purple-900 text-white p-6 sm:p-8 relative overflow-hidden shadow-xl shadow-brand-900/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 text-white font-black text-3xl flex items-center justify-center shadow-lg shadow-black/25 shrink-0 border-2 border-white/20">
            {fullName ? fullName.charAt(0) : 'U'}
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">{fullName || 'Estudiante'}</h1>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Rol: {user?.role || 'STUDENT'}
              </span>
            </div>

            <p className="text-white/80 text-xs sm:text-sm font-medium">{user?.email}</p>

            <div className="flex items-center gap-3 text-xs text-white/70 flex-wrap pt-1">
              <span className="flex items-center gap-1 font-semibold text-brand-200">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{academicProgram || 'Ingeniería de Sistemas'}</span>
              </span>
              <span>•</span>
              <span>{university || 'UPTC Tunja'}</span>
              <span>•</span>
              <span className="font-bold text-emerald-300">Semestre {semester} de 10</span>
            </div>
          </div>
        </div>

        {/* Academic Progress bar in card */}
        <div className="pt-5 mt-5 border-t border-white/15 relative z-10 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-white/80 font-bold">
            <span>Progreso de Carrera</span>
            <span>{Math.min(100, (Number(semester) || 1) * 10)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-brand-300 transition-all duration-500"
              style={{ width: `${Math.min(100, (Number(semester) || 1) * 10)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Offline Storage Management Card */}
      <div className="rounded-3xl glass-panel p-6 border border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/25">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Almacenamiento Offline del Dispositivo
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
                PWA Local
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Administra los apuntes, PDFs y fotos guardados en tu equipo para consultar sin conexión y liberar espacio.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowStorageModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-md shadow-indigo-600/25"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Gestionar Almacenamiento</span>
          </button>

          {/* Opción Servidor y Auditoría: EXCLUSIVA para rol ADMIN */}
          {user?.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => setShowAuditModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 transition border border-slate-700"
              title="Consola de Administración y Auditoría del Servidor"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Consola Servidor</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Edit Form */}
      <div className="rounded-3xl glass-panel p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Información del Estudiante</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Actualiza tus datos para personalizar los grupos y recomendaciones académicas.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Universidad
              </label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Programa Académico / Carrera
              </label>
              <input
                type="text"
                value={academicProgram}
                onChange={(e) => setAcademicProgram(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Semestre Actual (1 a 10)
            </label>
            <input
              type="number"
              min="1"
              max="15"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Biografía o Intereses Académicos
            </label>
            <textarea
              rows={3}
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              placeholder="Describe tus fortalezas, materias que dominas o temas en los que buscas ayuda..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-2xs"
            />
          </div>

          {/* Privacy Geolocation Settings (RN-12) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Ubicación Privada de Referencia (RN-12)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleGpsUpdate}
                className="px-3 py-1 rounded-xl bg-brand-50 dark:bg-brand-600/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30 text-xs font-bold flex items-center gap-1.5 hover:bg-brand-100 transition shadow-2xs"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Usar GPS Actual</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tus coordenadas son <strong>100% privadas</strong>. Nunca se muestran a otros estudiantes en tu perfil. Solo se usan internamente en tu dispositivo para calcular las distancias en kilómetros a grupos de estudio cercanos usando la fórmula Haversine.
            </p>

            {/* Selector de Edificio Campus UPTC */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Punto de Referencia Campus:</span>
              </div>
              <select
                onChange={(e) => handleSelectCampusPreset(e.target.value)}
                defaultValue=""
                className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="" disabled>Seleccionar sede/edificio UPTC...</option>
                {UPTC_CAMPUS_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Latitud privada</label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 shadow-2xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Longitud privada</label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 shadow-2xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>

        {/* Web Push Notifications Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Notificaciones Web Push (VAPID)
              </h3>
            </div>
            {pushStatus === 'SUBSCRIBED' && (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Activadas</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Recibe avisos inmediatos en tu dispositivo cuando aprueben tu ingreso a grupos, publiquen nuevos encuentros o se sincronice un recurso offline.
          </p>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleEnablePush}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/25 transition"
            >
              Habilitar Notificaciones Push
            </button>

            <button
              type="button"
              onClick={handleTestPush}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition shadow-2xs"
            >
              Probar Notificación
            </button>
          </div>
        </div>
      </div>

      {/* Storage Management Modal */}
      <StorageManagerModal
        isOpen={showStorageModal}
        onClose={() => setShowStorageModal(false)}
      />

      {/* Admin Portal (Dynamic Lazy Loading - Exclusivo ADMIN) */}
      <AdminPortal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />
    </div>
  );
}
