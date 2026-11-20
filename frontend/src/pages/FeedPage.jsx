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
  GraduationCap,
  CloudUpload,
  BarChart3,
  Globe
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
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestName, setSuggestName] = useState('');
  const [suggestDesc, setSuggestDesc] = useState('');

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
    <div className="space-y-5 pb-24">

      {/* ================================================================
          1. HERO BANNER — matches target image: indigo/violet gradient,
             UPTC building photo (SVG simulation), cursive tagline
          ================================================================ */}
      <div
        className="rounded-2xl text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1060 0%, #2d1b8a 35%, #3d2496 55%, #4a2fa0 70%, #3b2080 100%)',
          minHeight: '230px'
        }}
      >
        {/* Decorative circle glow top-right */}
        <div
          className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }}
        />

        {/* UPTC Building Illustration — right half */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none select-none flex items-stretch overflow-hidden">
          <svg viewBox="0 0 420 230" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
            {/* Sky gradient wash */}
            <defs>
              <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f3ba8" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#1a1060" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="bldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <rect width="420" height="230" fill="url(#skyGrad)" />

            {/* Trees silhouette */}
            <ellipse cx="60" cy="140" rx="40" ry="55" fill="#2d1b6e" opacity="0.7" />
            <ellipse cx="90" cy="130" rx="35" ry="50" fill="#312080" opacity="0.6" />
            <ellipse cx="360" cy="145" rx="38" ry="50" fill="#2d1b6e" opacity="0.65" />
            <ellipse cx="390" cy="135" rx="30" ry="45" fill="#312080" opacity="0.55" />
            <rect x="52" y="180" width="12" height="50" fill="#1e1060" opacity="0.7" />
            <rect x="82" y="175" width="10" height="55" fill="#1e1060" opacity="0.7" />
            <rect x="354" y="182" width="12" height="48" fill="#1e1060" opacity="0.65" />
            <rect x="384" y="178" width="10" height="52" fill="#1e1060" opacity="0.6" />

            {/* Main building facade */}
            <rect x="100" y="60" width="220" height="170" fill="url(#bldGrad)" opacity="0.55" />
            {/* Cornice/frieze */}
            <rect x="95" y="57" width="230" height="8" fill="white" opacity="0.4" />
            {/* Columns */}
            {[115, 140, 165, 220, 245, 270, 295].map((x, i) => (
              <rect key={i} x={x} y="65" width="10" height="140" fill="white" opacity="0.25" rx="2" />
            ))}
            {/* Windows row 1 */}
            {[110, 145, 180, 230, 265, 300].map((x, i) => (
              <rect key={i} x={x} y="80" width="22" height="32" rx="11" fill="white" opacity="0.45" />
            ))}
            {/* Windows row 2 */}
            {[110, 145, 180, 230, 265, 300].map((x, i) => (
              <rect key={i} x={x} y="125" width="22" height="28" rx="4" fill="white" opacity="0.4" />
            ))}
            {/* Windows row 3 */}
            {[110, 145, 180, 230, 265, 300].map((x, i) => (
              <rect key={i} x={x} y="162" width="22" height="28" rx="4" fill="white" opacity="0.35" />
            ))}
            {/* Central entrance */}
            <rect x="186" y="175" width="48" height="55" rx="4" fill="white" opacity="0.3" />
            <rect x="195" y="145" width="30" height="40" rx="15" fill="white" opacity="0.4" />
            {/* Pediment triangle */}
            <polygon points="210,42 95,65 325,65" fill="white" opacity="0.35" />
            {/* Ground */}
            <rect x="0" y="210" width="420" height="20" fill="#1a1060" opacity="0.6" />

            {/* Decorative square accent top-right (matches image) */}
            <rect x="370" y="12" width="18" height="18" rx="3" fill="#818cf8" opacity="0.6" />
            <rect x="395" y="30" width="12" height="12" rx="2" fill="#a78bfa" opacity="0.4" />
          </svg>
        </div>

        {/* Cursive tagline overlay */}
        <div
          className="absolute bottom-6 right-6 sm:right-16 z-10 pointer-events-none select-none hidden sm:block"
          style={{ transform: 'rotate(-6deg)' }}
        >
          <p
            className="font-handwriting text-3xl text-white font-bold tracking-wide drop-shadow-lg"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
          >
            Aprende,<br />comparte, avanza
          </p>
          <svg className="w-44 h-4 -mt-1" viewBox="0 0 180 16" fill="none">
            <path d="M 4,10 Q 90,2 176,12" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Content — left side */}
        <div className="relative z-10 p-6 sm:p-9 max-w-lg space-y-4">
          {/* UniLink · UPTC pill */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#c4b5fd' }}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>UniLink • UPTC</span>
          </div>

          {/* Title — two lines like target image */}
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white">
            Recursos Académicos &{' '}
            <span style={{ color: '#a78bfa' }}>Apuntes PWA</span>
          </h1>

          <p className="text-sm text-indigo-100/85 leading-relaxed">
            Descubre apuntes de clase, grabaciones de cátedra y talleres compartidos.
            Conecta con la comunidad UPTC y accede a la tecnología Offline-First.
          </p>

          {/* 4 Stat Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {[
              { icon: BookOpen, label: 'Apuntes en Feed', value: `+${posts.length} disponibles`, color: '#818cf8' },
              { icon: Layers, label: 'Materias Activas', value: `${categories.length} materias`, color: '#c084fc' },
              { icon: CloudUpload, label: 'Modo Offline', value: isOnline ? 'Listo (Sync)' : 'Sin Red', color: '#67e8f9' },
              { icon: ShieldCheck, label: 'Seguridad PWA', value: 'Auditoría A+', color: '#6ee7b7', onClick: onOpenAudit },
            ].map(({ icon: Icon, label, value, color, onClick }, i) => (
              <div
                key={i}
                onClick={onClick}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl ${onClick ? 'cursor-pointer hover:opacity-80' : ''} transition`}
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                <div className="min-w-0">
                  <span className="text-[9px] block" style={{ color: '#c4b5fd' }}>{label}</span>
                  <span className="text-[11px] font-extrabold text-white block leading-tight" style={i === 3 ? { color: '#6ee7b7' } : {}}>{value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================
          2. SEARCH BAR
          ================================================================ */}
      <div className="relative">
        <div className="flex items-center rounded-2xl bg-white border border-slate-200 shadow-sm p-1.5 focus-within:ring-2 focus-within:ring-indigo-400/30 focus-within:border-indigo-400 transition-all">
          <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar apuntes por tema, palabra clave, profesor, materia o aula..."
            className="w-full px-3 py-2 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-slate-600 mr-2">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center gap-1.5 transition shrink-0 shadow-md"
            style={{ background: '#4f46e5' }}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ================================================================
          3. FORMAT CARDS — 4 cards, first one purple-filled when active
          ================================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { filter: 'ALL', icon: Layers, title: 'Todos los formatos', sub: 'PDF, Word, etc.', accentBg: '#4f46e5' },
          { filter: 'DOCUMENT', icon: FileText, title: 'Documentos PDF / Word', sub: 'Apuntes y guías' },
          { filter: 'AUDIO', icon: Mic, title: 'Grabaciones de Voz', sub: 'Clases y conferencias' },
          { filter: 'LOCATION', icon: MapPin, title: 'Con Mapa en Campus', sub: 'Encuentra recursos' },
        ].map(({ filter, icon: Icon, title, sub }) => {
          const active = formatFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setFormatFilter(filter)}
              className="p-4 rounded-2xl text-left transition-all flex items-center justify-between group border"
              style={
                active
                  ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', borderColor: 'transparent', boxShadow: '0 4px 20px rgba(79,70,229,0.35)' }
                  : { background: 'white', color: '#1e293b', borderColor: '#e2e8f0' }
              }
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={active ? { background: 'rgba(255,255,255,0.2)' } : { background: '#ede9fe' }}
                >
                  <Icon className="w-5 h-5" style={active ? { color: 'white' } : { color: '#7c3aed' }} />
                </div>
                <div>
                  <h4 className="text-xs font-black">{title}</h4>
                  <p className="text-[10px] mt-0.5" style={active ? { color: 'rgba(255,255,255,0.75)' } : { color: '#94a3b8' }}>{sub}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1" style={active ? { color: 'white' } : { color: '#cbd5e1' }} />
            </button>
          );
        })}
      </div>

      {/* ================================================================
          4. EXPLORE BY CATEGORY
          ================================================================ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Explora por categoría</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowSuggestModal(true)}
            className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
          <button
            onClick={() => setSelectedCategory(null)}
            className="px-3.5 py-2 rounded-2xl whitespace-nowrap transition flex items-center gap-2 border"
            style={
              selectedCategory === null
                ? { background: '#1e1b4b', color: 'white', borderColor: 'transparent' }
                : { background: 'white', color: '#475569', borderColor: '#e2e8f0' }
            }
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
                className="px-3.5 py-2 rounded-2xl whitespace-nowrap transition flex items-center gap-2 border"
                style={
                  active
                    ? { background: '#1e1b4b', color: 'white', borderColor: 'transparent' }
                    : { background: 'white', color: '#475569', borderColor: '#e2e8f0' }
                }
              >
                <Icon className="w-3.5 h-3.5" style={{ color: active ? 'white' : '#6366f1' }} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================================================================
          5. TWO-COLUMN LAYOUT: Feed + Sidebar Widgets
          ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-1">

        {/* Main column: Recursos Destacados */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Recursos destacados</h3>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              {filteredPosts.length} publicaciones
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((n) => (
                <div key={n} className="rounded-3xl bg-white p-6 animate-pulse border border-slate-100 space-y-4">
                  <div className="flex gap-4">
                    <div className="w-32 h-32 rounded-2xl bg-slate-100 shrink-0" />
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
            <div className="rounded-3xl bg-white p-12 text-center border border-dashed border-slate-200 space-y-3">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-700">No se encontraron recursos</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Prueba restableciendo los filtros o comparte el primer apunte.
              </p>
              <Link
                to="/create-post"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-extrabold shadow-md"
                style={{ background: '#4f46e5' }}
              >
                <Plus className="w-4 h-4" />
                <span>Publicar Recurso</span>
              </Link>
            </div>
          )}
        </div>

        {/* Right widgets column */}
        <div className="space-y-4">

          {/* Widget 1: Nuestra Comunidad */}
          <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-black text-slate-900">Nuestra comunidad</h4>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <Users className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                <span className="text-xl font-black text-slate-900 block">{posts.length}</span>
                <span className="text-[10px] text-slate-400 block leading-tight">Apuntes en Feed</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <BookOpen className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <span className="text-xl font-black text-slate-900 block">{categories.length}</span>
                <span className="text-[10px] text-slate-400 block leading-tight">Materias Activas</span>
              </div>
              <div
                onClick={onOpenAudit}
                className="p-3 rounded-2xl cursor-pointer hover:scale-105 transition-transform border"
                style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <span className="text-xl font-black text-emerald-600 block">A+</span>
                <span className="text-[10px] text-emerald-600 block leading-tight font-semibold">Auditoría PWA</span>
              </div>
            </div>
          </div>

          {/* Widget 2: Actividad Reciente */}
          <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <h4 className="text-sm font-black text-slate-900">Actividad reciente</h4>
              </div>
              <Link to="/offline-queue" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-0.5">
                Ver más <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { icon: Code, color: '#ede9fe', iconColor: '#7c3aed', label: 'Nuevo apunte en Programación', time: 'Hace 1 h' },
                { icon: CheckCircle2, color: '#d1fae5', iconColor: '#059669', label: 'Sincronización completada', time: 'Hace 2 h' },
                { icon: Calendar, color: '#faf5ff', iconColor: '#9333ea', label: 'Taller de Bases de Datos', time: 'Hace 4 h' },
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

          {/* Widget 3: CTA Mapa */}
          <div
            className="rounded-3xl text-white p-5 shadow-md space-y-3"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)' }}
          >
            <h4 className="text-sm font-black">¿Buscas compañeros de estudio?</h4>
            <p className="text-xs text-white/80 leading-relaxed">
              Explora en el mapa de la UPTC los grupos activos cercanos a tu ubicación.
            </p>
            <Link
              to="/map"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white font-extrabold text-xs shadow-md transition hover:scale-105"
              style={{ color: '#4f46e5' }}
            >
              <Compass className="w-4 h-4" />
              <span>Abrir Mapa de Grupos</span>
            </Link>
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
                <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md" style={{ background: '#4f46e5' }}>
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
