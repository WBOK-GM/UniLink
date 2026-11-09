import React, { useState, useEffect } from 'react';
import { User, MapPin, Bell, Shield, Navigation, Save, CheckCircle, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function ProfilePage() {
  const { user, updateUserProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [biography, setBiography] = useState('');
  const [university, setUniversity] = useState('');
  const [academicProgram, setAcademicProgram] = useState('');
  const [semester, setSemester] = useState(1);
  const [latitude, setLatitude] = useState(4.60971);
  const [longitude, setLongitude] = useState(-74.08175);
  const [saving, setSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState('DEFAULT');

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

  const handleGpsUpdate = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          alert('📍 Coordenadas actualizadas desde tu GPS local.');
        },
        (err) => alert('No se pudo acceder al GPS: ' + err.message)
      );
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      <div className="rounded-2xl glass-panel p-6 sm:p-8 border border-slate-200/90 dark:border-slate-700/80 shadow-sm dark:shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            {fullName ? fullName.charAt(0) : 'U'}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{fullName || 'Estudiante'}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
            <span className="text-[11px] font-bold text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15 px-2.5 py-0.5 rounded-md border border-brand-200 dark:border-brand-500/30 inline-block mt-1">
              Rol: {user?.role || 'STUDENT'}
            </span>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">Universidad</label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">Programa Académico / Carrera</label>
              <input
                type="text"
                value={academicProgram}
                onChange={(e) => setAcademicProgram(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">Semestre Actual</label>
            <input
              type="number"
              min="1"
              max="15"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">Biografía o Intereses</label>
            <textarea
              rows={3}
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              placeholder="Escribe tus intereses académicos, temas que dominas o estás estudiando..."
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-sm"
            />
          </div>

          {/* Privacy Geolocation Settings (RN-12) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Ubicación Privada de Referencia (RN-12)</h3>
              </div>
              <button
                type="button"
                onClick={handleGpsUpdate}
                className="px-3 py-1 rounded-lg bg-brand-50 dark:bg-brand-600/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30 text-xs font-semibold flex items-center gap-1.5 hover:bg-brand-100 dark:hover:bg-brand-600/30 transition shadow-sm"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Usar GPS Actual</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tus coordenadas son <strong>100% privadas</strong>. Nunca se muestran a otros estudiantes en tu perfil. Solo se usan internamente en tu dispositivo para calcular las distancias en kilómetros a grupos de estudio cercanos.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Latitud privada</label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 shadow-sm"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Longitud privada</label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>

        {/* Web Push Notifications Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 pt-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Notificaciones Web Push (VAPID)</h3>
            </div>
            {pushStatus === 'SUBSCRIBED' && (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Activadas</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Recibe avisos inmediatos en tu dispositivo cuando aprueben tu ingreso a grupos, publiquen nuevos encuentros o se sincronice un recurso offline.
          </p>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleEnablePush}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition"
            >
              Habilitar Notificaciones Push
            </button>

            <button
              type="button"
              onClick={handleTestPush}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition shadow-sm"
            >
              Probar Notificación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
