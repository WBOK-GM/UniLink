import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  BookOpen,
  Filter,
  RefreshCw,
  FolderPlus,
  Sparkles,
  Layers,
  FileText,
  Mic,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  X,
  Compass,
  ArrowRight
} from 'lucide-react';
import { api } from '../api/client';
import { db } from '../db/db';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../hooks/useOfflineSync';

export default function FeedPage() {
  const { user } = useAuth();
  const { isOnline, pendingCount } = useOfflineSync();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [resourceTypeFilter, setResourceTypeFilter] = useState('ALL'); // ALL, DOCUMENT, AUDIO, LOCATION
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestName, setSuggestName] = useState('');
  const [suggestDesc, setSuggestDesc] = useState('');

  const loadData = async () => {
    try {
      const [catRes, postRes] = await Promise.all([
        api.getCategories().catch(() => ({ success: false, categories: [] })),
        api.getPosts(selectedCategory ? `category_id=${selectedCategory}` : '').catch(() => ({ success: false, posts: [] }))
      ]);

      if (catRes.success) setCategories(catRes.categories || []);
      if (postRes.success) {
        setPosts(postRes.posts || []);
        try {
          await db.cached_feed.clear();
          await db.cached_feed.bulkAdd(postRes.posts || []);
        } catch (e) {}
      } else {
        const cached = await db.cached_feed.toArray();
        if (cached.length > 0) setPosts(cached);
      }
    } catch (err) {
      console.warn('Error cargando feed, intentando caché:', err);
      try {
        const cached = await db.cached_feed.toArray();
        if (cached.length > 0) setPosts(cached);
      } catch (e) {}
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSuggestSubmit = async (e) => {
    e.preventDefault();
    if (!suggestName.trim()) return;
    try {
      const res = await api.suggestCategory({
        name: suggestName,
        description: suggestDesc
      });
      alert(res.message || 'Sugerencia enviada a revisión.');
      setShowSuggestModal(false);
      setSuggestName('');
      setSuggestDesc('');
      loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  // Filtrado por búsqueda y por tipo de recurso
  const filteredPosts = posts.filter(post => {
    // 1. Filtro de tipo de recurso
    if (resourceTypeFilter === 'DOCUMENT') {
      const hasDocs = post.attachments?.some(a => a.file_type === 'DOCUMENT' || a.mime_type?.includes('pdf') || a.mime_type?.includes('word'));
      if (!hasDocs) return false;
    } else if (resourceTypeFilter === 'AUDIO') {
      const hasAudio = post.attachments?.some(a => a.file_type === 'AUDIO' || a.mime_type?.startsWith('audio/'));
      if (!hasAudio) return false;
    } else if (resourceTypeFilter === 'LOCATION') {
      if (!post.location) return false;
    }

    // 2. Filtro de búsqueda textual
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      post.title?.toLowerCase().includes(q) ||
      post.content?.toLowerCase().includes(q) ||
      post.category?.name?.toLowerCase().includes(q) ||
      post.author?.full_name?.toLowerCase().includes(q) ||
      post.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      
      {/* Modern Collegiate Hero Banner with Live Stats */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-brand-600 to-purple-700 p-6 sm:p-8 text-white shadow-xl shadow-brand-500/20 relative overflow-hidden transition-all duration-200">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold text-white mb-3 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Comunidad Universitaria UPTC Tunja</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                Recursos Académicos & Apuntes PWA
              </h1>
              <p className="text-white/80 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
                Descubre apuntes de clase, grabaciones de cátedra y talleres compartidos. Funciona 100% sin conexión gracias a la tecnología Offline-First.
              </p>
            </div>

            <Link
              to="/create-post"
              className="px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-brand-700 font-extrabold text-xs sm:text-sm shadow-lg shadow-black/10 flex items-center gap-2 transition hover:scale-105 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 text-brand-600" />
              <span>Subir Aporte</span>
            </Link>
          </div>

          {/* Quick Stats Bar in Hero */}
          <div className="pt-3 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="text-[10px] text-white/70 uppercase font-bold block">Aportes en Feed</span>
              <span className="text-base sm:text-lg font-black">{posts.length}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="text-[10px] text-white/70 uppercase font-bold block">Materias Activas</span>
              <span className="text-base sm:text-lg font-black">{categories.length}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="text-[10px] text-white/70 uppercase font-bold block">Modo Offline</span>
              <span className="text-base sm:text-lg font-black">{isOnline ? 'Listo (Sync)' : 'Activo'}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="text-[10px] text-white/70 uppercase font-bold block">Seguridad PWA</span>
              <span className="text-base sm:text-lg font-black text-emerald-300">Auditoría A+</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar & Resource Filters */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar apuntes por tema, palabra clave, profesor, materia o aula..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 shadow-xs transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Resource Type Filter Pills (Todos, Documentos, Audios, Ubicación) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
          <button
            onClick={() => setResourceTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 ${
              resourceTypeFilter === 'ALL'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25 font-bold'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todos los formatos</span>
          </button>

          <button
            onClick={() => setResourceTypeFilter('DOCUMENT')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 ${
              resourceTypeFilter === 'DOCUMENT'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25 font-bold'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Documentos PDF / Word</span>
          </button>

          <button
            onClick={() => setResourceTypeFilter('AUDIO')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 ${
              resourceTypeFilter === 'AUDIO'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25 font-bold'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Grabaciones de Voz</span>
          </button>

          <button
            onClick={() => setResourceTypeFilter('LOCATION')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 ${
              resourceTypeFilter === 'LOCATION'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25 font-bold'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Con Mapa en Campus</span>
          </button>
        </div>

        {/* Categories Pills Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === null
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            Todas las asignaturas ({categories.length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}

          <button
            onClick={() => setShowSuggestModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20 whitespace-nowrap flex items-center gap-1.5 transition ml-auto shadow-2xs"
            title="Sugerir nueva categoría"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Sugerir Materia</span>
          </button>
        </div>
      </div>

      {/* Stream Controls Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 font-semibold">
        <span>Mostrando {filteredPosts.length} recurso(s) académico(s)</span>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Actualizar Feed</span>
        </button>
      </div>

      {/* Posts Stream */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-3xl glass-panel p-6 animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-2">
                  <div className="w-36 h-3.5 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  <div className="w-24 h-2.5 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                </div>
              </div>
              <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="w-full h-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredPosts.length > 0 ? (
        <div className="space-y-5">
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} onPostUpdated={loadData} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl glass-panel p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No se encontraron publicaciones con estos criterios
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery || resourceTypeFilter !== 'ALL'
              ? 'Intenta restablecer los filtros de búsqueda para ver más recursos.'
              : 'Sé el primero en compartir un apunte, guía o resumen en esta categoría.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            {(searchQuery || resourceTypeFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setResourceTypeFilter('ALL');
                  setSelectedCategory(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Limpiar filtros
              </button>
            )}
            <Link
              to="/create-post"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition shadow-md shadow-brand-600/25"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Publicar apunte</span>
            </Link>
          </div>
        </div>
      )}

      {/* Suggest Category Modal */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
              Proponer Nueva Asignatura o Categoría
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Si tu materia o cátedra no aparece en el catálogo, proponla aquí. Se agregará para que toda la comunidad pueda subir apuntes sobre ella.
            </p>

            <form onSubmit={handleSuggestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Nombre de la materia *
                </label>
                <input
                  type="text"
                  required
                  value={suggestName}
                  onChange={(e) => setSuggestName(e.target.value)}
                  placeholder="Ej: Computabilidad y Complejidad"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Descripción breve (opcional)
                </label>
                <textarea
                  rows={2}
                  value={suggestDesc}
                  onChange={(e) => setSuggestDesc(e.target.value)}
                  placeholder="Área temática, departamento o temario general..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500 shadow-2xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSuggestModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-600/30"
                >
                  Enviar propuesta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
