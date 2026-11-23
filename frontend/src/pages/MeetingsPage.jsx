import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Plus,
  CheckCircle,
  XCircle,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function MeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulario nuevo encuentro
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupId, setGroupId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDatetime, setStartDatetime] = useState('');
  const [meetingMode, setMeetingMode] = useState('IN_PERSON');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [maxAttendees, setMaxAttendees] = useState(20);
  const [submitting, setSubmitting] = useState(false);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const [meetRes, grpRes] = await Promise.all([
        api.getMeetings(),
        api.getGroups()
      ]);
      if (meetRes.success) setMeetings(meetRes.meetings || []);
      if (grpRes.success) {
        const myGroups = (grpRes.groups || []).filter(g => g.my_membership?.status === 'ACTIVE');
        setGroups(myGroups);
        setGroupId(myGroups[0]?.id || '');
      }
    } catch (e) {
      console.warn('Error cargando encuentros:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const handleRsvp = async (meetingId, status) => {
    if (!user) {
      alert('Debes iniciar sesión para confirmar asistencia.');
      return;
    }
    try {
      const res = await api.rsvpMeeting(meetingId, status);
      alert(res.message);
      loadMeetings();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!groupId || !title.trim() || !startDatetime) return;

    try {
      setSubmitting(true);
      const res = await api.createMeeting({
        group_id: groupId,
        title,
        description,
        start_datetime: startDatetime,
        meeting_mode: meetingMode,
        location,
        meeting_link: meetingLink,
        max_attendees: Number(maxAttendees)
      });

      if (res.success) {
        alert('Encuentro académico programado correctamente.');
        setShowCreateModal(false);
        setTitle('');
        setDescription('');
        loadMeetings();
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateDetails = (isoStr) => {
    const d = new Date(isoStr);
    const day = d.getDate();
    const month = d.toLocaleDateString('es-CO', { month: 'short' }).toUpperCase();
    const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const weekday = d.toLocaleDateString('es-CO', { weekday: 'long' });
    return { day, month, time, weekday };
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-900 via-brand-800 to-purple-900 text-white p-6 sm:p-8 relative overflow-hidden shadow-xl shadow-brand-900/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-white shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>Agenda Académica Universitaria</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Encuentros & Sesiones de Estudio
            </h1>
            <p className="text-white/80 text-xs sm:text-sm max-w-xl leading-relaxed">
              Talleres presenciales en campus, asesorías de monitores y sesiones virtuales para preparar parciales y proyectos.
            </p>
          </div>

          <button
            onClick={() => {
              if (user?.role === 'GUEST') {
                alert('Modo Invitado: Para agendar o proponer encuentros de estudio debes registrarte o iniciar sesión.');
                return;
              }
              if (groups.length === 0) {
                alert('Debes pertenecer a un grupo activo para programar encuentros.');
                return;
              }
              setShowCreateModal(true);
            }}
            className="px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-brand-700 font-extrabold text-xs sm:text-sm shadow-lg shadow-black/15 flex items-center gap-2 transition hover:scale-105 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 text-brand-600" />
            <span>Programar Sesión</span>
          </button>
        </div>
      </div>

      {/* Meetings List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="rounded-3xl glass-panel p-6 animate-pulse h-40 space-y-3" />
          ))}
        </div>
      ) : meetings.length > 0 ? (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const isConfirmed = meeting.my_rsvp === 'CONFIRMED';
            const isDeclined = meeting.my_rsvp === 'DECLINED';
            const canRsvp = groups.some(g => g.id === meeting.group_id && g.my_membership?.status === 'ACTIVE');
            const { day, month, time, weekday } = formatDateDetails(meeting.start_datetime);

            return (
              <div
                key={meeting.id}
                className="rounded-3xl glass-panel p-5 sm:p-7 border border-slate-200/90 dark:border-slate-800 card-hover-lift flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-xs transition-all"
              >
                <div className="flex items-start gap-4 flex-1">
                  {/* Calendar Date Block */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-brand-50 to-indigo-100 dark:from-brand-950/60 dark:to-indigo-900/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider">{month}</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white leading-tight">{day}</span>
                  </div>

                  {/* Meeting Details */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30">
                        {meeting.group_name}
                      </span>

                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                        meeting.meeting_mode === 'IN_PERSON'
                          ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/25'
                          : meeting.meeting_mode === 'VIRTUAL'
                          ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/25'
                          : 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/25'
                      }`}>
                        {meeting.meeting_mode === 'IN_PERSON' ? 'Presencial' : meeting.meeting_mode === 'VIRTUAL' ? 'Virtual' : 'Híbrido'}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      {meeting.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                      {meeting.description || 'Sin descripción detallada.'}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap pt-1 font-semibold">
                      <span className="flex items-center gap-1.5 text-brand-700 dark:text-brand-300 font-bold">
                        <Clock className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                        <span>{weekday}, {time}</span>
                      </span>

                      {meeting.location && (
                        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>{meeting.location}</span>
                        </span>
                      )}

                      {meeting.meeting_link && (
                        <a
                          href={meeting.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-bold"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Unirme a videollamada</span>
                        </a>
                      )}

                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <b>{meeting.confirmed_count}</b> confirmados
                      </span>
                    </div>
                  </div>
                </div>

                {/* RSVP Action Buttons */}
                {!canRsvp ? (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 w-full sm:w-auto">
                    Únete al grupo para confirmar asistencia
                  </span>
                ) : (
                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-start pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 font-bold hidden sm:block">¿Asistirás?</span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRsvp(meeting.id, 'CONFIRMED')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs ${
                        isConfirmed
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{isConfirmed ? 'Confirmado' : 'Asistiré'}</span>
                    </button>

                    <button
                      onClick={() => handleRsvp(meeting.id, 'DECLINED')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs ${
                        isDeclined
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>No asistiré</span>
                    </button>
                  </div>
                </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl glass-panel p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
          <Calendar className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">No hay sesiones de estudio agendadas</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Sé el primero en programar una sesión académica para tu grupo.</p>
        </div>
      )}

      {/* Modal Programar Encuentro */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1.5">
              Programar Sesión Académica
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Crea un encuentro presencial o virtual para los miembros de tu grupo de estudio.
            </p>

            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Grupo asociado *
                </label>
                <select
                  required
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500 shadow-2xs"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Título de la sesión *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Repaso de Parcial 2 y Taller Práctico"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Modalidad *
                  </label>
                  <select
                    value={meetingMode}
                    onChange={(e) => setMeetingMode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500 shadow-2xs"
                  >
                    <option value="IN_PERSON">Presencial</option>
                    <option value="VIRTUAL">Virtual</option>
                    <option value="HYBRID">Híbrido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                    Fecha y Hora *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startDatetime}
                    onChange={(e) => setStartDatetime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Lugar físico en campus (o aula)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej: Biblioteca Central piso 3, cubículo 8"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Enlace virtual (Meet / Teams / Zoom)
                </label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/xyz-abc"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Descripción y Temario
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Temas que se abordarán, guías necesarias..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Cupo máximo de asistentes
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxAttendees}
                  onChange={(e) => setMaxAttendees(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
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
                  {submitting ? 'Programando...' : 'Programar Encuentro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
