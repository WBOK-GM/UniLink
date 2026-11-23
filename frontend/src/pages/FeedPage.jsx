import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  BookOpen,
  Layers,
  FileText,
  Mic,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  X,
  Compass,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Grid,
  Code,
  Database,
  Cpu,
  Network,
  Calculator,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Star,
  Activity,
  Users,
  Calendar,
  GraduationCap,
  CloudUpload,
  BarChart3,
  Globe,
  Flame,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client';
import { db } from '../db/db';
import PostCard from '../components/PostCard';
import NotificationsBell from '../components/NotificationsBell';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../hooks/useOfflineSync';

export default function FeedPage({ onOpenAudit }) {
  const { user } = useAuth();
  const { isOnline, pendingCount } = useOfflineSync();
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [minRating, setMinRating] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [suggestName, setSuggestName] = useState('');
  const [suggestDesc, setSuggestDesc] = useState('');

  // Mobile View Toggle: Screen 1 (Inicio) vs Screen 2 (Buscar Recursos)
  const isSearchActive = searchParams.get('view') === 'search';

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
      try {
        const cached = await db.cached_feed.toArray();
        if (cached.length > 0) setPosts(cached);
      } catch (e) {}
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedCategory]);

  const handleSuggestSubmit = async (e) => {
    e.preventDefault();
    if (!suggestName.trim()) return;
    try {
      const res = await api.suggestCategory({ name: suggestName, description: suggestDesc });
      alert(res.message || 'Sugerencia enviada a revisión.');
      setShowSuggestModal(false);
      setSuggestName('');
      setSuggestDesc('');
      loadData();
    } catch (e) { alert(e.message); }
  };

  const filteredPosts = posts.filter(post => {
    if (formatFilter === 'DOCUMENT' || formatFilter === 'PDF' || formatFilter === 'WORD') {
      const hasDocs = post.attachments?.some(a => a.file_type === 'DOCUMENT' || a.mime_type?.includes('pdf') || a.mime_type?.includes('word'));
      if (!hasDocs) return false;
    } else if (formatFilter === 'AUDIO') {
      const hasAudio = post.attachments?.some(a => a.file_type === 'AUDIO' || a.mime_type?.startsWith('audio/'));
      if (!hasAudio) return false;
    } else if (formatFilter === 'LOCATION') {
      if (!post.location) return false;
    }
    if (minRating > 0 && (!post.average_rating || post.average_rating < minRating)) return false;
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

  const getCategoryIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('programac') || n.includes('software') || n.includes('sistemas')) return Code;
    if (n.includes('dato') || n.includes('sql')) return Database;
    if (n.includes('inteligen') || n.includes('ia') || n.includes('computac')) return Cpu;
    if (n.includes('red') || n.includes('comunica')) return Network;
    if (n.includes('matem') || n.includes('cálculo') || n.includes('fisic')) return Calculator;
    if (n.includes('web') || n.includes('pwa')) return Globe;
    return BookOpen;
  };

  return (
    <div>

      {/* ================================================================
          A. MOBILE VIEW (< lg): Matches user uploaded images 1 & 2
          ================================================================ */}
      <div className="block lg:hidden space-y-4 pb-20">

        {/* -------------------------------------------------------------
            SCREEN 2 (MOBILE): "Buscar Recursos" (when view=search)
            ------------------------------------------------------------- */}
        {isSearchActive ? (
          <div className="space-y-4 animate-fadeIn">
            {/* Screen 2 Top Bar: < Back, "Buscar Recursos", Filter button */}
            <div className="flex items-center justify-between pt-1 pb-1">
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="p-2 -ml-1 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 transition"
                title="Regresar a Inicio"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Buscar Recursos
              </h2>

              <button
                type="button"
                onClick={() => setShowFilterModal(!showFilterModal)}
                className="p-2 -mr-1 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 transition"
                title="Filtros"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>

            {/* Screen 2 Search Bar */}
            <div className="flex items-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 shadow-2xs">
              <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por tema, palabra clave..."
                className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Screen 2 Format Pills (Horizontal Scroll) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-0.5">
              {[
                { key: 'ALL', label: 'Todos', icon: Layers },
                { key: 'PDF', label: 'PDF', icon: null },
                { key: 'WORD', label: 'Word', icon: null },
                { key: 'AUDIO', label: 'Grabaciones', icon: null },
                { key: 'LOCATION', label: 'Mapa', icon: MapPin },
              ].map(item => {
                const active = formatFilter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFormatFilter(item.key)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                      active
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {item.icon && <item.icon className="w-3.5 h-3.5" />}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Star rating filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                Calificación:
              </span>
              {[
                { value: 0, label: 'Todas' },
                { value: 3, label: '3★+' },
                { value: 4, label: '4★+' },
                { value: 5, label: '5★' },
              ].map((item) => {
                const active = minRating === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setMinRating(item.value)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 ${
                      active
                        ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {item.value > 0 && (
                      <Star className={`w-3 h-3 ${active ? 'fill-white text-white' : 'fill-amber-400 text-amber-400'}`} />
                    )}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Screen 2: "Explora por Categoría" 2x3 Grid */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Explora por Categoría
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { name: 'Programación', icon: Code },
                  { name: 'Bases de Datos', icon: Database },
                  { name: 'Inteligencia Artificial', icon: Cpu },
                  { name: 'Redes y Distribuidos', icon: Network },
                  { name: 'Matemáticas y Cálculo', icon: Calculator },
                  { name: 'Proponer Materia', icon: BarChart3, isMore: true },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (item.isMore) {
                        setShowSuggestModal(true);
                      } else {
                        const match = categories.find(c => c.name.toLowerCase().includes(item.name.toLowerCase()));
                        setSelectedCategory(match ? match.id : null);
                        setSearchQuery(item.name);
                      }
                    }}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xs hover:border-indigo-300 transition text-center flex flex-col items-center justify-center gap-1.5 min-h-[76px] group active:scale-95"
                  >
                    <item.icon className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 leading-tight">
                      {item.name} {item.isMore && <ChevronRight className="w-3 h-3 text-slate-400" />}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Screen 2: "Recursos Recientes" Vertical List */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Recursos Recientes
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => { setFormatFilter('ALL'); setMinRating(0); setSearchQuery(''); setSelectedCategory(null); }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  Ver más →
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {filteredPosts.length > 0 ? (
                  filteredPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onPostUpdated={loadData}
                      compact
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">No hay recursos recientes para mostrar.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* -----------------------------------------------------------
             SCREEN 1 (MOBILE): "Inicio" Feed (Default View)
             ----------------------------------------------------------- */
          <div className="space-y-4 animate-fadeIn">
            
            {/* Hero Section Container with Building Photo & Header */}
            <div
              className="rounded-3xl text-white relative overflow-hidden px-5 pt-4 pb-10 shadow-xl min-h-[210px]"
              style={{
                background: 'linear-gradient(145deg, #100b2b 0%, #1e1250 45%, #2a186c 75%, #3b1d82 100%)'
              }}
            >
              {/* Campus Building blended on the right */}
              <div className="absolute right-0 inset-y-0 w-3/4 pointer-events-none select-none overflow-hidden">
                <img
                  src="/images/uptc_hero_facade.png"
                  alt="Campus Universitario"
                  className="w-full h-full object-cover object-left opacity-90"
                />
              </div>

              {/* Mobile Hero Header Row: Logo Campus + Bell & Avatar */}
              <div className="relative z-10 flex items-center justify-between pb-3">
                {/* Logo + Brand */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center p-1 bg-white/10 backdrop-blur-md border border-white/20 shadow-sm">
                    <img
                      src="/images/uptc_eagle_crest.png"
                      alt="Emblema UniLink"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-tight text-white leading-none">UniLink</h2>
                    <span className="text-[10px] font-bold text-indigo-200 tracking-wider">CAMPUS</span>
                  </div>
                </div>

                {/* Mobile notifications */}
                {user && (
                  <NotificationsBell
                    buttonClassName="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white relative transition shadow-2xs"
                    iconClassName="w-4 h-4 text-white"
                  />
                )}
              </div>

              {/* Title & Tagline */}
              <div className="relative z-10 max-w-[240px] pt-1 space-y-1">
                <h1 className="text-xl font-black text-white leading-tight">
                  Recursos Académicos
                </h1>
                <h2 className="text-xl font-black text-white leading-tight">
                  & Apuntes <span className="text-purple-400">PWA</span>
                </h2>
                <p className="text-xs text-indigo-100/80 pt-1.5 leading-relaxed">
                  Conecta, comparte y aprende con la comunidad universitaria.
                </p>
              </div>
            </div>

            {/* Overlapping Floating Search Bar Pill */}
            <div className="relative -mt-7 mx-2 z-20">
              <div
                onClick={() => setSearchParams({ view: 'search' })}
                className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-full px-4 py-2 shadow-lg shadow-indigo-950/15 border border-slate-100 dark:border-slate-800 cursor-pointer active:scale-[0.99] transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-400 truncate">
                    Buscar apuntes, temas, profesores...
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
                  <Search className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* 4 Stat Cards in 2x2 Grid (Matches Mobile Screen 1) */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div
                onClick={() => setSearchParams({ view: 'search' })}
                className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-2xs flex items-center justify-between cursor-pointer active:scale-95 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white block truncate">Apuntes en Feed</span>
                    <span className="text-[10px] text-slate-500 block truncate">+{posts.length} disponibles</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 ml-1" />
              </div>

              <div
                onClick={() => setSearchParams({ view: 'search' })}
                className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-2xs flex items-center justify-between cursor-pointer active:scale-95 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white block truncate">Materias Activas</span>
                    <span className="text-[10px] text-slate-500 block truncate">{categories.length} materias</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 ml-1" />
              </div>

              <Link
                to="/offline-queue"
                className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-2xs flex items-center justify-between cursor-pointer active:scale-95 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <CloudUpload className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white block truncate">Modo Offline</span>
                    <span className="text-[10px] text-slate-500 block truncate">{isOnline ? 'Listo (Sync)' : 'Sin Red'}</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 ml-1" />
              </Link>

              {user?.role === 'ADMIN' ? (
                <div
                  onClick={onOpenAudit}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-2xs flex items-center justify-between cursor-pointer active:scale-95 transition"
                  title="Abrir Consola del Servidor (Exclusivo Administrador)"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-900 dark:text-white block truncate">Consola Servidor</span>
                      <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 block truncate">Auditoría A+</span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-1" />
                </div>
              ) : (
                <Link
                  to="/profile"
                  className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-2xs flex items-center justify-between active:scale-95 transition"
                  title="Ver almacenamiento offline y perfil"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-900 dark:text-white block truncate">Mi Almacenamiento</span>
                      <span className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 block truncate">PWA Offline</span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-purple-500 shrink-0 ml-1" />
                </Link>
              )}
            </div>

            {/* Section: "Recursos Destacados" */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Recursos Destacados
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchParams({ view: 'search' })}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  Ver todos →
                </button>
              </div>

              {posts.length > 0 ? (
                <PostCard
                  post={posts[0]}
                  onPostUpdated={loadData}
                  compact
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
                  <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Aún no hay recursos destacados.</p>
                </div>
              )}

            </div>

          </div>
        )}

      </div>


      {/* ================================================================
          B. DESKTOP VIEW (>= lg): The exact collegiate reference design
          ================================================================ */}
      <div className="hidden lg:block space-y-4 pb-20">
        
        {/* 1. HERO BANNER PRINCIPAL (DESKTOP) */}
        <div
          className="rounded-3xl text-white relative overflow-hidden shadow-xl"
          style={{
            background: 'linear-gradient(135deg, #100b2b 0%, #1e1358 40%, #2a186c 70%, #3b1d82 100%)',
            minHeight: '235px'
          }}
        >
          {/* Campus building facade + trees + cursive slogan */}
          <div className="absolute right-0 top-0 bottom-0 w-3/5 pointer-events-none select-none flex items-stretch justify-end overflow-hidden">
            <img
              src="/images/uptc_hero_facade.png"
              alt="Campus Universitario"
              className="w-full h-full object-cover object-left"
            />
          </div>

          {/* Banner Left Content */}
          <div className="relative z-10 p-6 sm:p-8 max-w-lg space-y-3">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#c4b5fd' }}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>UniLink • Campus Universitario</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white">
              Recursos Académicos &<br />
              <span style={{ color: '#a78bfa' }}>Apuntes PWA</span>
            </h1>

            <p className="text-xs sm:text-sm text-indigo-100/85 leading-relaxed max-w-md">
              Descubre apuntes de clase, grabaciones de cátedra y talleres compartidos. Conecta con la comunidad académica y accede a la tecnología Offline-First.
            </p>

            {/* 4 Stat Pills inside Hero Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {[
                { icon: BookOpen, label: 'Apuntes en Feed', value: `+${posts.length} disponibles`, color: '#818cf8' },
                { icon: Layers, label: 'Materias Activas', value: `${categories.length} materias`, color: '#c084fc' },
                { icon: CloudUpload, label: 'Modo Offline', value: isOnline ? 'Listo (Sync)' : 'Sin Red', color: '#67e8f9' },
                user?.role === 'ADMIN'
                  ? { icon: ShieldCheck, label: 'Consola Servidor', value: 'Auditoría A+', color: '#6ee7b7', onClick: onOpenAudit }
                  : { icon: CheckCircle2, label: 'Almacenamiento', value: 'PWA Local', color: '#6ee7b7' },
              ].map(({ icon: Icon, label, value, color, onClick }, i) => (
                <div
                  key={i}
                  onClick={onClick}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl ${onClick ? 'cursor-pointer hover:bg-white/20' : ''} transition`}
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                  <div className="min-w-0">
                    <span className="text-[9px] block text-indigo-200">{label}</span>
                    <span className="text-[11px] font-extrabold text-white block leading-tight" style={i === 3 ? { color: '#6ee7b7' } : {}}>{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. SEARCH BAR (DESKTOP) */}
        <div className="relative">
          <div className="flex items-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs p-1.5 focus-within:ring-2 focus-within:ring-indigo-400/30 transition-all">
            <Search className="w-4 h-4 text-slate-400 ml-3.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar apuntes por tema, palabra clave, profesor, materia o aula..."
              className="w-full px-3 py-2 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-slate-600 mr-2">
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 transition shrink-0 shadow-md shadow-indigo-600/25"
            >
              <span>Buscar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. ROW 1: FORMAT SELECTION PILLS (Matches Target Reference Image) */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
          {/* Todos los formatos (Active Purple Pill with Dropdown) */}
          <button
            type="button"
            onClick={() => setFormatFilter('ALL')}
            className={`px-4 py-2 rounded-2xl whitespace-nowrap transition flex items-center gap-2 shadow-sm ${
              formatFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todos los formatos</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          </button>

          {/* Documentos PDF / Word */}
          <button
            type="button"
            onClick={() => setFormatFilter('DOCUMENT')}
            className={`px-4 py-2 rounded-2xl whitespace-nowrap transition flex items-center gap-2 shadow-2xs ${
              formatFilter === 'DOCUMENT'
                ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            <span>Documentos PDF / Word</span>
          </button>

          {/* Grabaciones de Voz */}
          <button
            type="button"
            onClick={() => setFormatFilter('AUDIO')}
            className={`px-4 py-2 rounded-2xl whitespace-nowrap transition flex items-center gap-2 shadow-2xs ${
              formatFilter === 'AUDIO'
                ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-300'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-purple-500" />
            <span>Grabaciones de Voz</span>
          </button>

          {/* Con Mapa en Campus */}
          <button
            type="button"
            onClick={() => setFormatFilter('LOCATION')}
            className={`px-4 py-2 rounded-2xl whitespace-nowrap transition flex items-center gap-2 shadow-2xs ${
              formatFilter === 'LOCATION'
                ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-300'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span>Con Mapa en Campus</span>
          </button>

          {/* Star rating filter */}
          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="ml-auto px-3 py-2 rounded-2xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:border-amber-400 shrink-0 cursor-pointer"
            title="Filtrar por calificación mínima"
          >
            <option value={0}>Todas las calificaciones</option>
            <option value={3}>3★ o más</option>
            <option value={4}>4★ o más</option>
            <option value={5}>Solo 5★</option>
          </select>
        </div>

        {/* 4. ROW 2: CATEGORY FILTER PILLS (Matches Target Reference Image) */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold flex-1">
            {/* Todas las asignaturas (Dark Navy Pill with Dropdown) */}
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="px-3.5 py-1.5 rounded-2xl whitespace-nowrap transition flex items-center gap-1.5 shadow-sm text-white"
              style={{ background: '#141a38' }}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-300" />
              <span>Todas las asignaturas ({categories.length})</span>
              <ChevronDown className="w-3 h-3 ml-0.5 text-slate-300" />
            </button>

            {/* Category Pills with Icons */}
            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat.name);
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(active ? null : cat.id)}
                  className={`px-3.5 py-1.5 rounded-2xl whitespace-nowrap transition flex items-center gap-1.5 border shadow-2xs ${
                    active
                      ? 'bg-indigo-600 text-white border-transparent'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-800 hover:border-indigo-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{cat.parent_id ? `↳ ${cat.name}` : cat.name}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowSuggestModal(true)}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0 ml-2"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 5. TWO-COLUMN LAYOUT: Feed + Clean Sidebar Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-1">
          
          {/* Main column: Recursos Destacados */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                  Recursos destacados
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                <span>1 publicación nueva</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((n) => (
                  <div key={n} className="rounded-3xl bg-white p-6 animate-pulse border border-slate-100 space-y-4">
                    <div className="flex gap-4">
                      <div className="w-36 h-36 rounded-2xl bg-slate-100 shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="w-24 h-4 bg-slate-100 rounded-lg" />
                        <div className="w-3/4 h-5 bg-slate-100 rounded-lg" />
                        <div className="w-full h-10 bg-slate-100 rounded-xl" />
                      </div>
                    </div>
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
              <div className="rounded-3xl bg-white dark:bg-slate-900 p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">No se encontraron recursos</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Prueba restableciendo los filtros o comparte el primer apunte.
                </p>
                <Link
                  to="/create-post"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-extrabold shadow-md bg-indigo-600 hover:bg-indigo-500"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publicar Recurso</span>
                </Link>
              </div>
            )}
          </div>

          {/* Right widgets column (Clean 2-Widget Layout matching Image 1) */}
          <div className="space-y-4">
            
            {/* Widget 1: Nuestra Comunidad */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Nuestra comunidad
                </h4>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <Users className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                  <span className="text-xl font-black text-slate-900 dark:text-white block">{posts.length}</span>
                  <span className="text-[10px] text-slate-400 block leading-tight">Apuntes en Feed</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <BookOpen className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <span className="text-xl font-black text-slate-900 dark:text-white block">{categories.length}</span>
                  <span className="text-[10px] text-slate-400 block leading-tight">Materias Activas</span>
                </div>
                {user?.role === 'ADMIN' ? (
                  <div
                    onClick={onOpenAudit}
                    className="p-3 rounded-2xl cursor-pointer hover:scale-105 transition-transform border"
                    style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}
                    title="Abrir Consola de Auditoría del Servidor"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                    <span className="text-xl font-black text-emerald-600 block">A+</span>
                    <span className="text-[10px] text-emerald-600 block leading-tight font-semibold">Consola Servidor</span>
                  </div>
                ) : (
                  <Link
                    to="/profile"
                    className="p-3 rounded-2xl cursor-pointer hover:scale-105 transition-transform border block"
                    style={{ background: '#f5f3ff', borderColor: '#ddd6fe' }}
                    title="Ver Gestión de Almacenamiento Local"
                  >
                    <CheckCircle2 className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                    <span className="text-xl font-black text-purple-600 block">PWA</span>
                    <span className="text-[10px] text-purple-600 block leading-tight font-semibold">Memoria Local</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Widget 2: Actividad Reciente */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">Actividad reciente</h4>
                </div>
                <Link to="/offline-queue" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-0.5">
                  Ver más →
                </Link>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { icon: BookOpen, color: '#ede9fe', iconColor: '#7c3aed', label: 'Nuevo aporte en Programación', time: 'Hace 1 h' },
                  { icon: CheckCircle2, color: '#d1fae5', iconColor: '#059669', label: 'Sincronización completada', time: 'Hace 2 h' }
                ].map(({ icon: Icon, color, iconColor, label, time }, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-xl" style={{ background: '#f8fafc' }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: color }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
                      </div>
                      <span className="font-semibold text-slate-700 truncate">{label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{time}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Suggest Modal */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 mb-1">Proponer Nueva Asignatura</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Sugiere una nueva materia para el catálogo de la comunidad estudiantil.
            </p>
            <form onSubmit={handleSuggestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Nombre de la materia *</label>
                <input
                  type="text"
                  required
                  value={suggestName}
                  onChange={(e) => setSuggestName(e.target.value)}
                  placeholder="Ej: Computabilidad y Complejidad"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Descripción breve (opcional)</label>
                <textarea
                  rows={2}
                  value={suggestDesc}
                  onChange={(e) => setSuggestDesc(e.target.value)}
                  placeholder="Área temática o temario general..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSuggestModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md bg-indigo-600 hover:bg-indigo-500">
                  Enviar propuesta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Filter Modal (for Mobile Screen 2 Sliders button) */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Filtros de Búsqueda
              </h3>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Formato de Recurso
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['ALL', 'DOCUMENT', 'AUDIO', 'LOCATION'].map(fmt => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormatFilter(fmt)}
                      className={`p-2 rounded-xl text-xs font-bold text-center border transition ${
                        formatFilter === fmt
                          ? 'bg-indigo-600 text-white border-transparent'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {fmt === 'ALL' ? 'Todos' : fmt === 'DOCUMENT' ? 'Documentos' : fmt === 'AUDIO' ? 'Audios' : 'Con Mapa'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Calificación mínima
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 0, label: 'Todas' },
                    { value: 3, label: '3★+' },
                    { value: 4, label: '4★+' },
                    { value: 5, label: '5★' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setMinRating(item.value)}
                      className={`p-2 rounded-xl text-xs font-bold text-center border transition ${
                        minRating === item.value
                          ? 'bg-amber-500 text-white border-transparent'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/30"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
