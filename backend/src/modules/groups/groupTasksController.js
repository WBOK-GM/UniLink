const { v4: uuidv4 } = require('uuid');
const { memoryStore } = require('../../config/db');

/**
 * Obtiene los miembros de un grupo con sus roles
 */
const getGroupMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const group = memoryStore.study_groups.find(g => g.id === id && g.status === 'ACTIVE');
    if (!group) {
      return res.status(404).json({ success: false, error: 'Grupo de estudio no encontrado.' });
    }

    const requestedStatus = req.query.status === 'PENDING' ? 'PENDING' : 'ACTIVE';
    const requesterId = req.user ? req.user.id : null;
    const requesterMembership = requesterId
      ? memoryStore.group_members.find(m => m.group_id === id && m.user_id === requesterId && m.membership_status === 'ACTIVE')
      : null;
    const canModerate = requesterId && (
      group.creator_id === requesterId ||
      (requesterMembership && ['OWNER', 'MODERATOR'].includes(requesterMembership.member_role)) ||
      req.user.role === 'ADMIN'
    );

    if (requestedStatus === 'PENDING' && !canModerate) {
      return res.status(403).json({ success: false, error: 'Solo el creador o moderadores pueden ver las solicitudes de ingreso.' });
    }

    const members = memoryStore.group_members
      .filter(m => m.group_id === id && m.membership_status === requestedStatus)
      .map(m => {
        const user = memoryStore.users.find(u => u.id === m.user_id);
        const profile = memoryStore.profiles.find(p => p.user_id === m.user_id);
        return {
          id: m.id,
          user_id: m.user_id,
          member_role: m.member_role, // 'OWNER' | 'MODERATOR' | 'MEMBER'
          membership_status: m.membership_status,
          joined_at: m.joined_at,
          full_name: profile?.full_name || 'Estudiante Universitario',
          academic_program: profile?.academic_program || 'Ingeniería',
          semester: profile?.semester || 1,
          email: user?.email
        };
      });

    return res.json({
      success: true,
      group_id: id,
      membership_status: requestedStatus,
      members
    });
  } catch (error) {
    console.error('Error en getGroupMembers:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Obtiene las tareas colaborativas de un grupo de estudio
 */
const getGroupTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const group = memoryStore.study_groups.find(g => g.id === id && g.status === 'ACTIVE');
    if (!group) {
      return res.status(404).json({ success: false, error: 'Grupo no encontrado.' });
    }

    if (!memoryStore.group_tasks) {
      memoryStore.group_tasks = [];
    }

    const tasks = memoryStore.group_tasks
      .filter(t => t.group_id === id)
      .map(t => {
        const assignedProfile = t.assigned_to ? memoryStore.profiles.find(p => p.user_id === t.assigned_to) : null;
        const creatorProfile = memoryStore.profiles.find(p => p.user_id === t.creator_id);

        return {
          ...t,
          assigned_user_name: assignedProfile?.full_name || 'Sin asignar',
          creator_name: creatorProfile?.full_name || 'Estudiante'
        };
      });

    return res.json({
      success: true,
      group_id: id,
      tasks
    });
  } catch (error) {
    console.error('Error en getGroupTasks:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Crea una nueva tarea en el grupo
 */
const createGroupTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, assigned_to, due_date } = req.body;
    const userId = req.user.id;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'El título de la tarea es obligatorio.' });
    }

    const group = memoryStore.study_groups.find(g => g.id === id && g.status === 'ACTIVE');
    if (!group) {
      return res.status(404).json({ success: false, error: 'Grupo no encontrado.' });
    }

    // Verificar si el usuario es miembro activo del grupo
    const membership = memoryStore.group_members.find(
      m => m.group_id === id && m.user_id === userId && m.membership_status === 'ACTIVE'
    );
    if (!membership) {
      return res.status(403).json({ success: false, error: 'Debes ser miembro activo del grupo para crear tareas.' });
    }

    if (!memoryStore.group_tasks) {
      memoryStore.group_tasks = [];
    }

    const taskId = uuidv4();
    const newTask = {
      id: taskId,
      group_id: id,
      creator_id: userId,
      title: title.trim(),
      description: description ? description.trim() : '',
      assigned_to: assigned_to || null,
      status: 'TODO', // 'TODO' | 'IN_PROGRESS' | 'DONE'
      due_date: due_date ? new Date(due_date) : new Date(Date.now() + 86400000 * 3),
      created_at: new Date(),
      updated_at: new Date()
    };

    memoryStore.group_tasks.push(newTask);

    return res.status(201).json({
      success: true,
      message: 'Tarea creada exitosamente en el grupo de estudio.',
      task: newTask
    });
  } catch (error) {
    console.error('Error en createGroupTask:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Actualiza el estado o detalles de una tarea (ej: TODO -> IN_PROGRESS -> DONE)
 */
const updateGroupTask = async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const { status, title, description, assigned_to } = req.body;
    const userId = req.user.id;

    if (!memoryStore.group_tasks) {
      memoryStore.group_tasks = [];
    }

    const task = memoryStore.group_tasks.find(t => t.id === taskId && t.group_id === id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Tarea no encontrada en este grupo.' });
    }

    // Verificar pertenencia al grupo
    const membership = memoryStore.group_members.find(
      m => m.group_id === id && m.user_id === userId && m.membership_status === 'ACTIVE'
    );
    if (!membership) {
      return res.status(403).json({ success: false, error: 'Solo miembros activos pueden modificar tareas.' });
    }

    if (status && ['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
      task.status = status;
    }
    if (title && title.trim()) {
      task.title = title.trim();
    }
    if (description !== undefined) {
      task.description = description.trim();
    }
    if (assigned_to !== undefined) {
      task.assigned_to = assigned_to;
    }
    task.updated_at = new Date();

    return res.json({
      success: true,
      message: 'Tarea actualizada exitosamente.',
      task
    });
  } catch (error) {
    console.error('Error en updateGroupTask:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Elimina una tarea del grupo
 */
const deleteGroupTask = async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const userId = req.user.id;

    if (!memoryStore.group_tasks) {
      memoryStore.group_tasks = [];
    }

    const taskIndex = memoryStore.group_tasks.findIndex(t => t.id === taskId && t.group_id === id);
    if (taskIndex === -1) {
      return res.status(404).json({ success: false, error: 'Tarea no encontrada.' });
    }

    const task = memoryStore.group_tasks[taskIndex];
    const membership = memoryStore.group_members.find(
      m => m.group_id === id && m.user_id === userId && m.membership_status === 'ACTIVE'
    );

    // Permisos: Creador de la tarea, o OWNER / MODERATOR del grupo
    const isTaskCreator = task.creator_id === userId;
    const isPrivileged = membership && ['OWNER', 'MODERATOR'].includes(membership.member_role);

    if (!isTaskCreator && !isPrivileged) {
      return res.status(403).json({ success: false, error: 'No tienes permisos para eliminar esta tarea.' });
    }

    memoryStore.group_tasks.splice(taskIndex, 1);

    return res.json({
      success: true,
      message: 'Tarea eliminada del grupo.'
    });
  } catch (error) {
    console.error('Error en deleteGroupTask:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getGroupMembers,
  getGroupTasks,
  createGroupTask,
  updateGroupTask,
  deleteGroupTask
};
