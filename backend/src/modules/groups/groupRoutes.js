const express = require('express');
const router = express.Router();
const { getGroups, getGroupById, createGroup, joinGroup } = require('./groupController');
const {
  getGroupMembers,
  getGroupTasks,
  createGroupTask,
  updateGroupTask,
  deleteGroupTask
} = require('./groupTasksController');
const { requireAuth, optionalAuth } = require('../../middlewares/auth');

router.get('/', optionalAuth, getGroups);
router.get('/:id', optionalAuth, getGroupById);
router.post('/', requireAuth, createGroup);
router.post('/:id/join', requireAuth, joinGroup);

// Rutas de Miembros, Roles y Tareas Colaborativas
router.get('/:id/members', optionalAuth, getGroupMembers);
router.get('/:id/tasks', requireAuth, getGroupTasks);
router.post('/:id/tasks', requireAuth, createGroupTask);
router.patch('/:id/tasks/:taskId', requireAuth, updateGroupTask);
router.delete('/:id/tasks/:taskId', requireAuth, deleteGroupTask);

module.exports = router;
