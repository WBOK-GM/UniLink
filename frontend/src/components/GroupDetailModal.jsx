import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  ListTodo,
  Shield,
  Plus,
  Trash2,
  Calendar,
  X,
  Sparkles,
  ArrowRight,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function GroupDetailModal({ isOpen, onClose, groupId, onGroupUpdated }) {
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('TASKS'); // 'TASKS' | 'MEMBERS'
  const [loading, setLoading] = useState(true);

  // Formulario nueva tarea
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);

  const loadData = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const [grpRes, memRes, taskRes] = await Promise.all([
        api.getGroupById(groupId).catch(() => ({ group: null })),
        api.getGroupMembers(groupId).catch(() => ({ members: [] })),
        api.getGroupTasks(groupId).catch(() => ({ tasks: [] }))
      ]);

      if (grpRes?.group) setGroup(grpRes.group);
      if (memRes?.members) setMembers(memRes.members);
      if (taskRes?.tasks) setTasks(taskRes.tasks);
    } catch (err) {
      console.warn('Error cargando detalles de grupo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && groupId) {
      loadData();
      setShowNewTaskForm(false);
    }
  }, [isOpen, groupId]);

  if (!isOpen || !groupId) return null;

  const isMember = group?.my_membership && group.my_membership.status === 'ACTIVE';
  const myRole = group?.my_membership?.role; // 'OWNER' | 'MODERATOR' | 'MEMBER'

  // Crear Tarea
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      setSubmittingTask(true);
      const res = await api.createGroupTask(groupId, {
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        assigned_to: assignedTo || null
      });

      if (res.success && res.task) {
        setTaskTitle('');
        setTaskDesc('');
        setAssignedTo('');
        setShowNewTaskForm(false);
        await loadData();
        if (onGroupUpdated) onGroupUpdated();
      }
    } catch (err) {
      alert(err.message || 'Error al crear tarea.');
    } finally {
      setSubmittingTask(false);
    }
  };

  // Cambiar estado de tarea (TODO -> IN_PROGRESS -> DONE)
  const handleToggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'TODO' ? 'IN_PROGRESS' : task.status === 'IN_PROGRESS' ? 'DONE' : 'TODO';
    try {
      await api.updateGroupTask(groupId, task.id, { status: nextStatus });
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Eliminar tarea
  const handleDeleteTask = async (taskId) => {
    if (!confirm('¿Deseas eliminar esta tarea del grupo?')) return;
    try {
      await api.deleteGroupTask(groupId, taskId);
      await loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {group?.name || 'Grupo de Estudio'}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  group?.group_type === 'PUBLIC'
                    ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30'
                }`}>
                  {group?.group_type === 'PUBLIC' ? 'Público' : 'Privado'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {group?.category?.name || 'Académico'} • {members.length} miembros activos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-header Tabs */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('TASKS')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'TASKS'
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Tareas Grupales ({tasks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MEMBERS')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === 'MEMBERS'
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Integrantes y Roles ({members.length})</span>
            </button>
          </div>

          {activeTab === 'TASKS' && isMember && (
            <button
              type="button"
              onClick={() => setShowNewTaskForm(!showNewTaskForm)}
              className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showNewTaskForm ? 'Cancelar' : 'Nueva Tarea'}</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs animate-pulse">
              Cargando actividades y miembros del grupo...
            </div>
          ) : activeTab === 'TASKS' ? (
            <div className="space-y-4">
              {/* Formulario Nueva Tarea */}
              {showNewTaskForm && (
                <form
                  onSubmit={handleCreateTask}
                  className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 space-y-3 animate-fadeIn"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                    Asignar Nueva Tarea al Grupo
                  </h4>

                  <div>
                    <input
                      type="text"
                      required
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="Título de la tarea (Ej: Preparar diapositivas de sustentación)"
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      placeholder="Detalles y requisitos..."
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />

                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="">Asignar a: Todo el grupo</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.full_name} ({m.member_role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowNewTaskForm(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submittingTask}
                      className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition shadow-xs"
                    >
                      {submittingTask ? 'Guardando...' : 'Crear Tarea'}
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Tareas */}
              {tasks.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold">No hay tareas pendientes en este grupo de estudio.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isMember ? 'Crea la primera tarea para organizar el trabajo con tus compañeros.' : 'Únete al grupo para ver y asignar tareas.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tasks.map((task) => {
                    const isDone = task.status === 'DONE';
                    const isInProgress = task.status === 'IN_PROGRESS';

                    return (
                      <div
                        key={task.id}
                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                          isDone
                            ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-75'
                            : isInProgress
                            ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/40'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTaskStatus(task)}
                            className="mt-0.5 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Cambiar estado de la tarea"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : isInProgress ? (
                              <Clock className="w-5 h-5 text-indigo-500 animate-pulse" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-slate-400" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <h5 className={`text-xs font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                              {task.title}
                            </h5>
                            {task.description && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                              <span>Responsable: <b className="text-slate-700 dark:text-slate-300">{task.assigned_user_name}</b></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTaskStatus(task)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                              isDone
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                : isInProgress
                                ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {isDone ? 'Completada' : isInProgress ? 'En Progreso' : 'Pendiente'}
                          </button>

                          {isMember && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Eliminar tarea"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* TAB: INTEGRANTES Y ROLES */
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {members.map((mem) => {
                  const isOwner = mem.member_role === 'OWNER';
                  const isMod = mem.member_role === 'MODERATOR';

                  return (
                    <div
                      key={mem.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {mem.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {mem.full_name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {mem.academic_program} • Semestre {mem.semester}
                          </p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                        isOwner
                          ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30'
                          : isMod
                          ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                          : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                      }`}>
                        {isOwner ? 'Creador' : isMod ? 'Moderador' : 'Integrante'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            {myRole ? `Tu rol en este grupo: ${myRole}` : 'No eres miembro de este grupo todavía'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-white transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
