const { v4: uuidv4 } = require('uuid');
const { memoryStore, pool, usePg } = require('../../config/db');
const { notifyUser } = require('../notifications/notificationController');

const getCategories = async (req, res) => {
  try {
    const activeCategories = memoryStore.categories.filter(c => c.status === 'ACTIVE');
    return res.json({ success: true, categories: activeCategories });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const suggestCategory = async (req, res) => {
  try {
    const { name, parent_id, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'El nombre de la categoría es requerido.' });
    }

    const normalized_name = name.toLowerCase().trim().replace(/\s+/g, '-');

    // RN-14: Verificar si ya existe en la misma categoría padre
    const existing = memoryStore.categories.find(
      c => c.normalized_name === normalized_name && (c.parent_id === (parent_id || null))
    );

    if (existing) {
      return res.status(200).json({
        success: true,
        alreadyExists: true,
        message: 'La categoría ya existe en el catálogo oficial.',
        category: existing
      });
    }

    const suggestion = {
      id: uuidv4(),
      user_id: req.user.id,
      name: name.trim(),
      normalized_name,
      parent_id: parent_id || null,
      description: description || '',
      status: 'PENDING',
      created_at: new Date()
    };

    memoryStore.category_suggestions.push(suggestion);

    return res.status(201).json({
      success: true,
      message: 'Propuesta de categoría enviada para revisión de moderación.',
      suggestion
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Consulta de sugerencias de categorías pendientes (Exclusivo Administrador)
 */
const getCategorySuggestions = async (req, res) => {
  try {
    const suggestions = memoryStore.category_suggestions.map(s => {
      const proposer = memoryStore.profiles.find(p => p.user_id === s.user_id) || {};
      const userObj = memoryStore.users.find(u => u.id === s.user_id) || {};
      return {
        ...s,
        proposer: {
          full_name: proposer.full_name || 'Estudiante',
          email: userObj.email || ''
        }
      };
    });
    return res.json({ success: true, suggestions });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Aprobación de categoría sugerida (Exclusivo Administrador)
 * Activa la categoría para que esté disponible de inmediato en filtros y publicaciones
 */
const approveCategorySuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const suggestion = memoryStore.category_suggestions.find(s => s.id === id);
    if (!suggestion) {
      return res.status(404).json({ success: false, error: 'Propuesta de categoría no encontrada.' });
    }

    suggestion.status = 'APPROVED';
    suggestion.reviewed_by = adminId;
    suggestion.reviewed_at = new Date();

    // Crear la categoría oficial activa
    const newCategory = {
      id: uuidv4(),
      name: suggestion.name,
      normalized_name: suggestion.normalized_name,
      parent_id: suggestion.parent_id || null,
      description: suggestion.description || '',
      status: 'ACTIVE',
      created_at: new Date()
    };

    memoryStore.categories.push(newCategory);

    // Notificar al estudiante que propuso la categoría
    if (suggestion.user_id) {
      await notifyUser(suggestion.user_id, {
        title: '🎉 Categoría Aprobada',
        message: `Tu propuesta para la categoría "${newCategory.name}" ha sido aprobada e integrada al catálogo oficial.`,
        url: '/',
        notification_type: 'CATEGORY_APPROVED',
        reference_type: 'CATEGORY',
        reference_id: newCategory.id
      }).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Categoría "${newCategory.name}" aprobada e integrada al catálogo oficial.`,
      category: newCategory
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Rechazo de sugerencia de categoría (Exclusivo Administrador)
 */
const rejectCategorySuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const suggestion = memoryStore.category_suggestions.find(s => s.id === id);
    if (!suggestion) {
      return res.status(404).json({ success: false, error: 'Propuesta de categoría no encontrada.' });
    }

    suggestion.status = 'REJECTED';
    suggestion.reviewed_by = adminId;
    suggestion.reviewed_at = new Date();

    return res.json({
      success: true,
      message: 'Propuesta de categoría rechazada.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Creación directa de categoría oficial (Exclusivo Administrador)
 */
const createCategory = async (req, res) => {
  try {
    const { name, parent_id, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'El nombre de la categoría es requerido.' });
    }

    const normalized_name = name.toLowerCase().trim().replace(/\s+/g, '-');

    const existing = memoryStore.categories.find(
      c => c.normalized_name === normalized_name && (c.parent_id === (parent_id || null))
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe una categoría con este nombre en el nivel seleccionado.'
      });
    }

    const newCategory = {
      id: uuidv4(),
      name: name.trim(),
      normalized_name,
      parent_id: parent_id || null,
      description: description || '',
      status: 'ACTIVE',
      created_at: new Date()
    };

    memoryStore.categories.push(newCategory);

    return res.status(201).json({
      success: true,
      message: 'Categoría oficial creada exitosamente.',
      category: newCategory
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getCategories,
  suggestCategory,
  getCategorySuggestions,
  approveCategorySuggestion,
  rejectCategorySuggestion,
  createCategory
};
