import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  ArrowRight,
  Code,
  Database,
  Cpu,
  Network,
  Calculator,
  Download,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Star,
  Activity,
  Users,
  Calendar,
  ExternalLink,
  GraduationCap,
  CloudUpload
} from 'lucide-react';
import { api } from '../api/client';
import { db } from '../db/db';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../hooks/useOfflineSync';

export default function FeedPage({ onOpenAudit }) {
  const { user } = useAuth();
  const { isOnline, pendingCount } = useOfflineSync();
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formatFilter, setFormatFilter] = useState('ALL'); // ALL, DOCUMENT, AUDIO, LOCATION
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestName, setSuggestName] = useState('');
  const [suggestDesc, setSuggestDesc] = useState('');

  // Sincronizar parámetro url si viene con ?format=
  useEffect(() => {
    const f = searchParams.get('format');
    if (f) setFormatFilter(f);
  }, [searchParams]);

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
      console.warn('Error cargando feed, usando caché offline:', err);
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

  // Filtrado de publicaciones
  const filteredPosts = posts.filter(post => {
    if (formatFilter === 'DOCUMENT') {
      const hasDocs = post.attachments?.some(a => a.file_type === 'DOCUMENT' || a.mime_type?.includes('pdf') || a.mime_type?.includes('word'));
      if (!hasDocs) return false;
    } else if (formatFilter === 'AUDIO') {
      const hasAudio = post.attachments?.some(a => a.file_type === 'AUDIO' || a.mime_type?.startsWith('audio/'));
      if (!hasAudio) return false;
    } else if (formatFilter === 'LOCATION') {
      if (!post.location) return false;
    }

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

  // Íconos temáticos para categorías académicas
  const getCategoryIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('programac') || n.includes('software') || n.includes('sistemas')) return Code;
    if (n.includes('dato') || n.includes('sql')) return Database;
    if (n.includes('inteligen') || n.includes('ia') || n.includes('computac')) return Cpu;
    if (n.includes('red') || n.includes('comunica')) return Network;
    if (n.includes('matem') || n.includes('cálculo') || n.includes('fisic')) return Calculator;
    return BookOpen;
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* ========================================================
          1. HERO BANNER PRINCIPAL (Inspirado en la Imagen de Referencia)
          ======================================================== */}
      <div className="rounded-3xl bg-gradient-to-r from-[#171347] via-[#2a1c72] to-[#3f2084] text-white p-6 sm:p-9 relative overflow-hidden shadow-xl shadow-brand-950/20 border border-brand-500/20">
        
        {/* Background Building Graphic / Photo Simulation */}
        <div className="absolute right-0 top-0 bottom-0 w-full sm:w-1/2 opacity-25 sm:opacity-40 pointer-events-none select-none flex items-center justify-end overflow-hidden">
          <svg viewBox="0 0 500 320" className="h-full w-auto fill-current text-indigo-100">
            {/* Architectural Facade of Historic UPTC Building */}
            <rect x="50" y="40" width="400" height="240" fill="#1e1858" />
            <rect x="70" y="60" width="360" height="20" fill="#ffffff" opacity="0.3" />
            {/* Windows Matrix */}
            {[0, 1, 2, 3, 4, 5, 6].map(col => (
              <React.Fragment key={col}>
                <rect x={85 + col * 50} y="95" width="28" height="40" rx="3" fill="#ffffff" opacity="0.6" />
                <rect x={85 + col * 50} y="150" width="28" height="40" rx="3" fill="#ffffff" opacity="0.6" />
                <rect x={85 + col * 50} y="205" width="28" height="40" rx="3" fill="#ffffff" opacity="0.6" />
              </React.Fragment>
            ))}
            {/* Central Entrance Columns */}
            <rect x="210" y="80" width="80" height="180" fill="#2d2280" />
            <rect x="225" y="100" width="10" height="150" fill="#ffffff" opacity="0.5" />
            <rect x="245" y="100" width="10" height="150" fill="#ffffff" opacity="0.5" />
            <rect x="265" y="100" width="10" height="150" fill="#ffffff" opacity="0.5" />
            <polygon points="210,80 290,80 250,45" fill="#ffffff" opacity="0.7" />
          </svg>
        </div>

        {/* Cursive Tagline Over Building: "Aprende, comparte, avanza" */}
        <div className="absolute right-6 sm:right-12 bottom-20 z-10 hidden sm:block transform rotate-[-6deg] select-none pointer-events-none">
          <p className="font-handwriting text-3xl sm:text-4xl text-white font-bold tracking-wide drop-shadow-md">
            Aprende, comparte, avanza
          </p>
          {/* Golden accent underline curve */}
          <svg className="w-48 h-5 text-amber-400 stroke-current -mt-2" viewBox="0 0 200 20" fill="none">
            <path d="M 5,12 Q 100,2 195,14" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>

        {/* Content Box on Left */}
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-indigo-100 shadow-2xs">
            <GraduationCap className="w-3.5 h-3.5 text-brand-300" />
            <span>UniLink • UPTC</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
            Recursos Académicos & Apuntes PWA
          </h1>

          <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed max-w-xl">
            Descubre apuntes de clase, grabaciones de cátedra y talleres compartidos. Conecta con la comunidad UPTC y accede a la tecnología Offline-First.
          </p>

          {/* 4 Stat Pills (Matches Reference Image) */}
          <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <BookOpen className="w-4 h-4 text-brand-300 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-indigo-200 block truncate">Apuntes en Feed</span>
                <span className="text-xs sm:text-sm font-extrabold text-white block">+{posts.length} disponibles</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <Layers className="w-4 h-4 text-purple-300 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-indigo-200 block truncate">Materias Activas</span>
                <span className="text-xs sm:text-sm font-extrabold text-white block">{categories.length} materias</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <CloudUpload className="w-4 h-4 text-sky-300 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-indigo-200 block truncate">Modo Offline</span>
                <span className="text-xs sm:text-sm font-extrabold text-white block">{isOnline ? 'Listo (Sync)' : 'Sin Red'}</span>
              </div>
            </div>

            <div
              onClick={onOpenAudit}
              className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 cursor-pointer transition"
              title="Abrir auditoría PWA"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-indigo-200 block truncate">Seguridad PWA</span>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-300 block">Auditoría A+</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. BUSCADOR ESTILIZADO CON BOTÓN PURPLE
          ======================================================== */}
      <div className="relative">
        <div className="flex items-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm p-1.5 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
          <Search className="w-4 h-4 text-slate-400 ml-3.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar apuntes por tema, palabra clave, profesor, materia o aula..."
            className="w-full px-3 py-2 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 transition shrink-0 shadow-md shadow-brand-600/20"
          >
            <span>Buscar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================
          3. TARJETAS DE ACCESO RÁPIDO POR FORMATO (Grid de 4)
          ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Todos los formatos */}
        <button
          type="button"
          onClick={() => setFormatFilter('ALL')}
          className={`p-4 rounded-2xl text-left transition-all flex items-center justify-between group ${
            formatFilter === 'ALL'
              ? 'bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-brand-600/25 ring-2 ring-brand-500/30'
              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-slate-700 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              formatFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400'
            }`}>
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black">Todos los formatos</h4>
              <p className={`text-[10px] ${formatFilter === 'ALL' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                PDF, Word, etc.
              </p>
            </div>
          </div>
          <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${formatFilter === 'ALL' ? 'text-white' : 'text-slate-400'}`} />
        </button>

        {/* 2. Documentos PDF / Word */}
        <button
          type="button"
          onClick={() => setFormatFilter('DOCUMENT')}
          className={`p-4 rounded-2xl text-left transition-all flex items-center justify-between group ${
            formatFilter === 'DOCUMENT'
              ? 'bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-brand-600/25 ring-2 ring-brand-500/30'
              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-slate-700 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              formatFilter === 'DOCUMENT' ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
            }`}>
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black">Documentos PDF / Word</h4>
              <p className={`text-[10px] ${formatFilter === 'DOCUMENT' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                Apuntes y guías
              </p>
            </div>
          </div>
          <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${formatFilter === 'DOCUMENT' ? 'text-white' : 'text-slate-400'}`} />
        </button>

        {/* 3. Grabaciones de Voz */}
        <button
          type="button"
          onClick={() => setFormatFilter('AUDIO')}
          className={`p-4 rounded-2xl text-left transition-all flex items-center justify-between group ${
            formatFilter === 'AUDIO'
              ? 'bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-brand-600/25 ring-2 ring-brand-500/30'
              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-slate-700 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              formatFilter === 'AUDIO' ? 'bg-white/20 text-white' : 'bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400'
            }`}>
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black">Grabaciones de Voz</h4>
              <p className={`text-[10px] ${formatFilter === 'AUDIO' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                Clases y conferencias
              </p>
            </div>
          </div>
          <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${formatFilter === 'AUDIO' ? 'text-white' : 'text-slate-400'}`} />
        </button>

        {/* 4. Con Mapa en Campus */}
        <button
          type="button"
          onClick={() => setFormatFilter('LOCATION')}
          className={`p-4 rounded-2xl text-left transition-all flex items-center justify-between group ${
            formatFilter === 'LOCATION'
              ? 'bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-brand-600/25 ring-2 ring-brand-500/30'
              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-slate-700 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              formatFilter === 'LOCATION' ? 'bg-white/20 text-white' : 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400'
            }`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black">Con Mapa en Campus</h4>
              <p className={`text-[10px] ${formatFilter === 'LOCATION' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                Encuentra recursos
              </p>
            </div>
          </div>
          <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${formatFilter === 'LOCATION' ? 'text-white' : 'text-slate-400'}`} />
        </button>
      </div>

      {/* ========================================================
          4. EXPLORA POR CATEGORÍA
          ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              Explora por categoría
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setShowSuggestModal(true)}
            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Categories Horizontal Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3.5 py-2 rounded-2xl whitespace-nowrap transition flex items-center gap-2 ${
              selectedCategory === null
                ? 'bg-[#151c38] text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todas las asignaturas ({categories.length})</span>
          </button>

          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.name);
            const active = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(active ? null : cat.id)}
                className={`px-3.5 py-2 rounded-2xl whitespace-nowrap transition flex items-center gap-2 ${
                  active
                    ? 'bg-[#151c38] text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-brand-500" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          5. DOS COLUMNAS: FEED DE RECURSOS + WIDGETS LATERALES
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        
        {/* Columna Principal Izquierda (2 Cols): Recursos Destacados y Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                Recursos destacados & Feed
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              {filteredPosts.length} publicaciones
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((n) => (
                <div key={n} className="rounded-3xl bg-white dark:bg-slate-900 p-6 animate-pulse border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  <div className="w-3/4 h-6 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  <div className="w-full h-12 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredPosts.length > 0 ? (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} onPostUpdated={loadData} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No se encontraron recursos con los filtros actuales
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Prueba restableciendo los filtros o comparte el primer apunte en esta materia.
              </p>
              <Link
                to="/create-post"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-extrabold shadow-md shadow-brand-600/25"
              >
                <Plus className="w-4 h-4" />
                <span>Publicar Recurso</span>
              </Link>
            </div>
          )}
        </div>

        {/* Columna Lateral Derecha (1 Col): Widgets "Nuestra Comunidad" y "Actividad Reciente" */}
        <div className="space-y-5">
          
          {/* Widget 1: Nuestra Comunidad (Matches Reference Image) */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Nuestra comunidad
              </h4>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <Users className="w-4 h-4 text-brand-600 dark:text-brand-400 mx-auto mb-1" />
                <span className="text-lg font-black text-slate-900 dark:text-white block">{posts.length}</span>
                <span className="text-[10px] text-slate-500 block leading-tight">Apuntes en Feed</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                <span className="text-lg font-black text-slate-900 dark:text-white block">{categories.length}</span>
                <span className="text-[10px] text-slate-500 block leading-tight">Materias Activas</span>
              </div>

              <div
                onClick={onOpenAudit}
                className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 cursor-pointer hover:scale-105 transition-transform"
                title="Ver informe de auditoría PWA"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block">A+</span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block leading-tight font-semibold">Auditoría PWA</span>
              </div>
            </div>
          </div>

          {/* Widget 2: Actividad Reciente (Matches Reference Image) */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Actividad reciente
                </h4>
              </div>
              <Link to="/offline-queue" className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline">
                Ver más →
              </Link>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Code className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    Nuevo apunte en Programación
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">Hace 1 h</span>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    Sincronización completada
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">Hace 2 h</span>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    Taller de Bases de Datos
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">Hace 4 h</span>
              </div>
            </div>
          </div>

          {/* Widget 3: Acceso Directo a Mapa y Grupos */}
          <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-indigo-700 text-white p-5 shadow-md shadow-brand-600/20 space-y-3">
            <h4 className="text-sm font-black">¿Buscas compañeros de estudio?</h4>
            <p className="text-xs text-white/80 leading-relaxed">
              Explora en el mapa geográfico de la UPTC los grupos activos cercanos a tu ubicación.
            </p>
            <Link
              to="/map"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-brand-700 font-extrabold text-xs shadow-md transition hover:scale-105"
            >
              <Compass className="w-4 h-4 text-brand-600" />
              <span>Abrir Mapa de Grupos</span>
            </Link>
          </div>

        </div>
      </div>

      {/* Modal Proponer Materia */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1.5">
              Proponer Nueva Asignatura
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Sugiere una nueva materia para el catálogo de la comunidad estudiantil.
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-2xs"
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
                  placeholder="Área temática o temario general..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500 shadow-2xs"
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
