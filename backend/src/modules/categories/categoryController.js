const { v4: uuidv4 } = require('uuid');
const { memoryStore } = require('../../config/db');

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

module.exports = {
  getCategories,
  suggestCategory
};
