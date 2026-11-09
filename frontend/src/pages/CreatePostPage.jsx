import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Image as ImageIcon,
  Mic,
  MapPin,
  Map,
  Navigation,
  UploadCloud,
  X,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { api } from '../api/client';
import { queueOfflinePost } from '../db/db';
import { useAuth } from '../context/AuthContext';
import AudioRecorder from '../components/AudioRecorder';
import CopyrightModal from '../components/CopyrightModal';
import LocationPickerModal from '../components/LocationPickerModal';

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [locationText, setLocationText] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [postType, setPostType] = useState('RESOURCE');

  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [recordedAudio, setRecordedAudio] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [showCopyrightModal, setShowCopyrightModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, grpRes] = await Promise.all([
          api.getCategories().catch(() => ({ categories: [] })),
          api.getGroups().catch(() => ({ groups: [] }))
        ]);
        if (catRes.categories) setCategories(catRes.categories);
        if (grpRes.groups) setGroups(grpRes.groups);
        if (catRes.categories?.length > 0) setCategoryId(catRes.categories[0].id);
      } catch (e) {}
    };
    fetchData();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId) {
      alert('Por favor completa el título, contenido y categoría.');
      return;
    }
    // Abrir modal de derechos de autor antes de procesar
    setShowCopyrightModal(true);
  };

  const executePostCreation = async () => {
    setShowCopyrightModal(false);
    setSubmitting(true);

    const clientOpId = crypto.randomUUID();

    // 1. MODO OFFLINE: Si no hay conexión, guardar en IndexedDB (Dexie)
    if (!navigator.onLine) {
      try {
        await queueOfflinePost({
          client_operation_id: clientOpId,
          title,
          content,
          category_id: categoryId,
          group_id: groupId || null,
          post_type: postType,
          location: locationText,
          attachments_meta: attachedFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
        });

        alert('📴 Publicación guardada en tu dispositivo (Modo Offline). Se enviará automáticamente cuando recuperes la conexión.');
        navigate('/offline-queue');
      } catch (err) {
        alert('Error al guardar localmente: ' + err.message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // 2. MODO ONLINE: Envío HTTP a la API REST
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('category_id', categoryId);
      if (groupId) formData.append('group_id', groupId);
      formData.append('post_type', postType);
      if (locationText) formData.append('location', locationText);
      formData.append('client_operation_id', clientOpId);
      formData.append('copyright_declaration_accepted', 'true');

      // Archivos adjuntos
      attachedFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      // Audio grabado
      if (recordedAudio) {
        formData.append('attachments', recordedAudio);
      }

      const res = await api.createPost(formData);
      if (res.success) {
        navigate('/');
      } else {
        alert(res.error || 'Error al crear la publicación.');
      }
    } catch (err) {
      console.warn('Fallo de red, guardando en cola offline:', err);
      // Fallback automático si la red falló durante el envío
      await queueOfflinePost({
        client_operation_id: clientOpId,
        title,
        content,
        category_id: categoryId,
        group_id: groupId || null,
        post_type: postType,
        location: locationText
      });
      alert('No se pudo contactar el servidor. Se guardó en la cola local offline.');
      navigate('/offline-queue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white mb-4 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al inicio</span>
      </button>

      <div className="rounded-2xl glass-panel p-6 sm:p-8 border border-slate-200/90 dark:border-slate-700/80 shadow-sm dark:shadow-2xl space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Compartir Recurso Académico</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sube apuntes, resúmenes, grabaciones de clase o talleres para la comunidad estudiantil.
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Título del recurso o publicación *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Apuntes de Grafos y Árboles - Semana 4"
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white shadow-sm focus:outline-none focus:border-brand-500 transition"
            />
          </div>

          {/* Category & Group Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Materia / Categoría *
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:border-brand-500 transition"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Destino (General o Grupo)
              </label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:border-brand-500 transition"
              >
                <option value="">Publicación general (Comunidad abierta)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    Grupo: {g.name} ({g.group_type === 'PUBLIC' ? 'Público' : 'Privado'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content Textarea */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Descripción y contenido explicativo *
            </label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Explica de qué trata el material, fórmulas importantes, profesor o recomendaciones de estudio..."
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white shadow-sm focus:outline-none focus:border-brand-500 transition resize-y"
            />
          </div>

          {/* Audio Recorder Component */}
          <AudioRecorder onAudioRecorded={(file) => setRecordedAudio(file)} />

          {/* File Attachments Dropzone */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Adjuntar Archivos (PDF, Word, Imágenes de apuntes)
            </label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 rounded-xl p-4 text-center cursor-pointer transition bg-slate-50/80 dark:bg-slate-900/40 relative">
              <input
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx,.txt,audio/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-8 h-8 text-brand-600 dark:text-brand-400 mx-auto mb-2" />
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                Arrastra archivos aquí o haz clic para seleccionar
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Soporta PDFs, documentos Word, imágenes y audios hasta 25MB</p>
            </div>

            {/* Attached files chips */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {attachedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                    <span className="truncate max-w-[160px] font-medium">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Optional Location with Interactive Map Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Ubicación opcional del recurso
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-600/20 hover:bg-brand-100 dark:hover:bg-brand-600/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>Seleccionar en Mapa</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!('geolocation' in navigator)) {
                      alert('Geolocalización no soportada.');
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const lat = pos.coords.latitude;
                        const lng = pos.coords.longitude;
                        const loc = {
                          latitude: lat,
                          longitude: lng,
                          placeName: 'Mi GPS actual',
                          formatted: `Mi ubicación GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`
                        };
                        setSelectedLocation(loc);
                        setLocationText(loc.formatted);
                      },
                      (err) => alert('No se pudo obtener GPS: ' + err.message),
                      { enableHighAccuracy: true }
                    );
                  }}
                  title="Usar GPS actual"
                  className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                >
                  <Navigation className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                title="Abrir mapa para seleccionar ubicación"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-600 dark:text-brand-400 hover:scale-110 transition"
              >
                <MapPin className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="Ej: Biblioteca piso 2, CTI o haz clic en Seleccionar en Mapa..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white shadow-sm focus:outline-none focus:border-brand-500 transition"
              />
              {locationText && (
                <button
                  type="button"
                  onClick={() => {
                    setLocationText('');
                    setSelectedLocation(null);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition"
                  title="Quitar ubicación"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Selected Location Pill / Card */}
            {locationText && (
              <div className="p-2.5 rounded-xl bg-brand-50/70 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800/40 flex items-center justify-between text-xs animate-fadeIn">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-6 h-6 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0">
                    📍
                  </span>
                  <div className="truncate">
                    <span className="font-semibold text-brand-900 dark:text-brand-200 block truncate">
                      {locationText}
                    </span>
                    <span className="text-[11px] text-brand-700 dark:text-brand-400">
                      Ubicación asignada a la publicación
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowLocationModal(true)}
                    className="text-[11px] font-semibold text-brand-700 dark:text-brand-300 hover:underline"
                  >
                    Cambiar en mapa
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Se solicitará confirmación de autoría (RN-30)</span>
            </span>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30 transition disabled:opacity-50"
            >
              {submitting ? 'Publicando...' : 'Publicar Recurso'}
            </button>
          </div>
        </form>
      </div>

      {/* Mandatory Copyright Modal */}
      <CopyrightModal
        isOpen={showCopyrightModal}
        onConfirm={executePostCreation}
        onCancel={() => setShowCopyrightModal(false)}
      />

      {/* Interactive Map Location Picker Modal */}
      <LocationPickerModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        initialPlaceName={selectedLocation?.placeName || locationText}
        initialCoords={selectedLocation ? { lat: selectedLocation.latitude, lng: selectedLocation.longitude } : undefined}
        onSelectLocation={(loc) => {
          setSelectedLocation(loc);
          setLocationText(loc.formatted);
        }}
      />
    </div>
  );
}
