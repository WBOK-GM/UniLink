import React, { useState, useEffect } from 'react';
import { Users, Plus, Lock, Unlock, MapPin, CheckCircle, Clock, Shield } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Formulario nuevo grupo
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [groupType, setGroupType] = useState('PUBLIC');
  const [maxMembers, setMaxMembers] = useState(30);
  const [latitude, setLatitude] = useState(4.6099);
  const [longitude, setLongitude] = useState(-74.0820);
  const [submitting, setSubmitting] = useState(false);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const [grpRes, catRes] = await Promise.all([
        api.getGroups(),
        api.getCategories()
      ]);
      if (grpRes.success) setGroups(grpRes.groups || []);
      if (catRes.success) {
        setCategories(catRes.categories || []);
        if (catRes.categories.length > 0) setCategoryId(catRes.categories[0].id);
      }
    } catch (e) {
      console.warn('Error cargando grupos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleJoin = async (groupId, groupType) => {
    if (!user) {
      alert('Debes iniciar sesión para unirte a grupos.');
      return;
    }
    try {
      const res = await api.joinGroup(groupId);
      alert(res.message);
      loadGroups();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;

    try {
      setSubmitting(true);
      const res = await api.createGroup({
        name,
        description,
        category_id: categoryId,
        group_type: groupType,
        max_members: Number(maxMembers),
        location_latitude: Number(latitude),
        location_longitude: Number(longitude)
      });

      if (res.success) {
        alert('Grupo de estudio creado exitosamente.');
        setShowCreateModal(false);
        setName('');
        setDescription('');
        loadGroups();
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const displayedGroups = groups.filter((g) => {
    if (activeTab === 'MINE') {
      return g.my_membership && g.my_membership.status === 'ACTIVE';
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Grupos de Estudio Académico</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Únete a comunidades de tu carrera o crea un grupo para coordinar talleres y sesiones de estudio.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-brand-600/30 flex items-center gap-2 transition hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nuevo Grupo</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeTab === 'ALL'
              ? 'bg-brand-50 dark:bg-brand-600/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Explorar Todos ({groups.length})
        </button>

        <button
          onClick={() => setActiveTab('MINE')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeTab === 'MINE'
              ? 'bg-brand-50 dark:bg-brand-600/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Mis Grupos ({groups.filter(g => g.my_membership?.status === 'ACTIVE').length})
        </button>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl glass-panel p-6 animate-pulse h-48" />
          ))}
        </div>
      ) : displayedGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedGroups.map((group) => {
            const isPublic = group.group_type === 'PUBLIC';
            const membership = group.my_membership;
            const isMember = membership && membership.status === 'ACTIVE';
            const isPending = membership && membership.status === 'PENDING';

            return (
              <div
                key={group.id}
                className="rounded-2xl glass-panel p-5 border border-slate-200/90 dark:border-slate-800/80 hover:border-brand-300 dark:hover:border-slate-700 transition flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                      {group.category?.name || 'General'}
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isPublic
                        ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                        : 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30'
                    }`}>
                      {isPublic ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      <span>{isPublic ? 'Público' : 'Privado'}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{group.name}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 mb-4 leading-relaxed">
                    {group.description || 'Sin descripción detallada.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Users className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                    <span>{group.members_count} miembros</span>
                  </div>

                  {isMember ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{membership.role === 'OWNER' ? 'Creador' : 'Miembro'}</span>
                    </span>
                  ) : isPending ? (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Solicitud pendiente</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleJoin(group.id, group.group_type)}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                        isPublic
                          ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30'
                      }`}
                    >
                      {isPublic ? 'Unirme ahora' : 'Solicitar ingreso'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl glass-panel p-12 text-center border border-dashed border-slate-300 dark:border-slate-800">
          <Users className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">No hay grupos en esta sección</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Crea un grupo de estudio o explora los existentes.</p>
        </div>
      )}

      {/* Modal Crear Grupo */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Crear Grupo de Estudio</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Configura el tipo de acceso y la ubicación geográfica de referencia para mostrarlo en el mapa.
            </p>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">Nombre del grupo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Grupo de Redes y Arquitectura de Computadores"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">Materia *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">Tipo de Grupo *</label>
                  <select
                    value={groupType}
                    onChange={(e) => setGroupType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="PUBLIC">Público (Ingreso Libre)</option>
                    <option value="PRIVATE">Privado (Requiere Aprobación)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objetivos de estudio, horarios habituales, etc..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">Latitud Mapa *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">Longitud Mapa *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md"
                >
                  {submitting ? 'Creando...' : 'Crear Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
