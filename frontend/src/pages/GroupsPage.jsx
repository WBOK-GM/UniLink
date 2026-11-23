import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Plus,
  Lock,
  Unlock,
  MapPin,
  CheckCircle,
  Clock,
  Shield,
  Search,
  Compass,
  ArrowRight,
  Sparkles,
  BookOpen,
  ListTodo
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import GroupDetailModal from '../components/GroupDetailModal';

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDetailGroupId, setSelectedDetailGroupId] = useState(null);

  // Formulario nuevo grupo
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [groupType, setGroupType] = useState('PUBLIC');
  const [maxMembers, setMaxMembers] = useState(30);
  const [latitude, setLatitude] = useState(5.5530); // Campus Tunja
  const [longitude, setLongitude] = useState(-73.3565);
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

  const handleJoin = async (groupId) => {
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
      const isMine = g.my_membership && g.my_membership.status === 'ACTIVE';
      if (!isMine) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.name?.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q) ||
      g.category?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-900 via-brand-800 to-purple-900 text-white p-6 sm:p-8 relative overflow-hidden shadow-xl shadow-brand-900/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-white shadow-2xs">
              <Users className="w-3.5 h-3.5 text-brand-300" />
              <span>Comunidades de Estudio Universitario</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Grupos y Círculos de Estudio
            </h1>
            <p className="text-white/80 text-xs sm:text-sm max-w-xl leading-relaxed">
              Únete a comunidades de tu facultad, asiste a talleres de repaso y encuentra compañeros de estudio según tu ubicación en el campus.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/map"
              className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm border border-white/20 flex items-center gap-2 transition backdrop-blur-md"
            >
              <Compass className="w-4 h-4 text-brand-300" />
              <span>Ver en Mapa</span>
            </Link>

            <button
              onClick={() => {
                if (user?.role === 'GUEST') {
                  alert('Modo Invitado: Para crear comunidades o grupos de estudio debes registrarte o iniciar sesión.');
                  return;
                }
                setShowCreateModal(true);
              }}
              className="px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-brand-700 font-extrabold text-xs sm:text-sm shadow-lg shadow-black/15 flex items-center gap-2 transition hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 text-brand-600" />
              <span>Crear Grupo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Tabs Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'ALL'
                ? 'bg-white dark:bg-slate-800 text-brand-700 dark:text-brand-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Explorar Todos ({groups.length})
          </button>

          <button
            onClick={() => setActiveTab('MINE')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'MINE'
                ? 'bg-white dark:bg-slate-800 text-brand-700 dark:text-brand-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Mis Grupos ({groups.filter(g => g.my_membership?.status === 'ACTIVE').length})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar grupo por nombre o materia..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-brand-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-3xl glass-panel p-6 animate-pulse h-52 space-y-3">
              <div className="flex justify-between">
                <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              </div>
              <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="w-full h-12 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            </div>
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
                className="rounded-3xl glass-panel p-6 border border-slate-200/90 dark:border-slate-800 card-hover-lift flex flex-col justify-between shadow-xs transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-bold px-3 py-1 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30">
                      {group.category?.name || 'General'}
                    </span>

                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      isPublic
                        ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                        : 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30'
                    }`}>
                      {isPublic ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      <span>{isPublic ? 'Público' : 'Privado'}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 leading-snug">
                    {group.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 mb-4 leading-relaxed">
                    {group.description || 'Sin descripción detallada.'}
                  </p>
                </div>

                <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold">
                    <Users className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <span>{group.members_count} miembros</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDetailGroupId(group.id)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
                      title="Ver integrantes, roles y tareas de este grupo"
                    >
                      <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Tareas & Roles</span>
                    </button>

                    {isMember ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{membership.role === 'OWNER' ? 'Creador' : 'Miembro'}</span>
                      </span>
                    ) : isPending ? (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pendiente</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleJoin(group.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-2xs ${
                          isPublic
                            ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-600/25'
                            : 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40'
                        }`}
                      >
                        {isPublic ? 'Unirme' : 'Solicitar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl glass-panel p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
          <Users className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">No hay grupos para mostrar</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Prueba con otros términos de búsqueda o crea el primero.</p>
        </div>
      )}

      {/* Modal Crear Grupo */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1.5">
              Crear Nuevo Grupo de Estudio
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Configura los detalles de tu comunidad académica y la ubicación de referencia en el campus para mostrarlo en el mapa geográfico.
            </p>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Nombre del grupo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Taller de Estructuras de Datos y Algoritmos"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Materia *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500 shadow-2xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.parent_id ? `↳ ${c.name}` : c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Acceso *
                  </label>
                  <select
                    value={groupType}
                    onChange={(e) => setGroupType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500 shadow-2xs"
                  >
                    <option value="PUBLIC">Público (Ingreso Libre)</option>
                    <option value="PRIVATE">Privado (Aprobación)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Descripción y Objetivos
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Horarios habituales, temas de repaso, lugar de reunión..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Latitud Mapa Campus
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Longitud Mapa Campus
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30"
                >
                  {submitting ? 'Creando...' : 'Crear Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Grupo, Miembros y Tablero de Tareas */}
      <GroupDetailModal
        isOpen={!!selectedDetailGroupId}
        groupId={selectedDetailGroupId}
        onClose={() => setSelectedDetailGroupId(null)}
        onGroupUpdated={loadGroups}
      />
    </div>
  );
}
