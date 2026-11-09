import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Video, Users, Plus, CheckCircle, XCircle } from 'lucide-react';
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
        setGroups(grpRes.groups || []);
        if (grpRes.groups.length > 0) setGroupId(grpRes.groups[0].id);
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

  const formatDate = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('es-CO', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Encuentros y Sesiones de Estudio</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Talleres, repasos presenciales y reuniones virtuales coordinadas por los grupos académicos.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-brand-600/30 flex items-center gap-2 transition hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Programar Encuentro</span>
        </button>
      </div>

      {/* Meetings List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="rounded-2xl glass-panel p-6 animate-pulse h-36" />
          ))}
        </div>
      ) : meetings.length > 0 ? (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const isConfirmed = meeting.my_rsvp === 'CONFIRMED';
            const isDeclined = meeting.my_rsvp === 'DECLINED';

            return (
              <div
                key={meeting.id}
                className="rounded-2xl glass-panel p-5 sm:p-6 border border-slate-800/80 hover:border-slate-700 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30">
                      {meeting.group_name}
                    </span>

                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      meeting.meeting_mode === 'IN_PERSON'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25'
                        : meeting.meeting_mode === 'VIRTUAL'
                        ? 'bg-blue-500/10 text-blue-300 border border-blue-500/25'
                        : 'bg-purple-500/10 text-purple-300 border border-purple-500/25'
                    }`}>
                      {meeting.meeting_mode === 'IN_PERSON' ? 'Presencial' : meeting.meeting_mode === 'VIRTUAL' ? 'Virtual' : 'Híbrido'}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white">{meeting.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                    {meeting.description || 'Sin descripción detallada.'}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-1">
                    <span className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-brand-400" />
                      {formatDate(meeting.start_datetime)}
                    </span>

                    {meeting.location && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        {meeting.location}
                      </span>
                    )}

                    {meeting.meeting_link && (
                      <a
                        href={meeting.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-blue-400 hover:underline"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Enlace de reunión</span>
                      </a>
                    )}

                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <b>{meeting.confirmed_count}</b> confirmados
                    </span>
                  </div>
                </div>

                {/* RSVP Controls */}
                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-start pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="text-right hidden sm:block">
                    <span className="text-[11px] text-slate-500">¿Asistirás?</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRsvp(meeting.id, 'CONFIRMED')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        isConfirmed
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{isConfirmed ? 'Confirmado' : 'Asistiré'}</span>
                    </button>

                    <button
                      onClick={() => handleRsvp(meeting.id, 'DECLINED')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        isDeclined
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>No asistiré</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl glass-panel p-12 text-center border border-dashed border-slate-800">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white">No hay encuentros programados</h3>
          <p className="text-xs text-slate-400 mt-1">Sé el primero en programar una sesión de estudio para tu grupo.</p>
        </div>
      )}

      {/* Modal Programar Encuentro */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl glass-panel p-6 border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-2">Programar Encuentro Académico</h3>
            <p className="text-xs text-slate-400 mb-4">
              Crea una sesión de estudio para los integrantes de tu grupo.
            </p>

            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Grupo asociado *</label>
                <select
                  required
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Título de la sesión *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Repaso de Parcial y Taller Práctico"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Modalidad *</label>
                  <select
                    value={meetingMode}
                    onChange={(e) => setMeetingMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200"
                  >
                    <option value="IN_PERSON">Presencial</option>
                    <option value="VIRTUAL">Virtual</option>
                    <option value="HYBRID">Híbrido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Fecha y Hora *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startDatetime}
                    onChange={(e) => setStartDatetime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Lugar físico o Aula</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej: Biblioteca piso 3, cubículo 12"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Enlace virtual (Meet / Teams / Zoom)</label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Temas a tratar, preparación previa..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white"
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
