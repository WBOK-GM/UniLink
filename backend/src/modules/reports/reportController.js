const { v4: uuidv4 } = require('uuid');
const { memoryStore } = require('../../config/db');

const createReport = async (req, res) => {
  try {
    const { post_id, reason, description } = req.body;
    const reporter_id = req.user.id;

    if (!post_id || !reason) {
      return res.status(400).json({ success: false, error: 'La publicación y el motivo son obligatorios.' });
    }

    const post = memoryStore.posts.find(p => p.id === post_id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Publicación no encontrada.' });
    }

    const report = {
      id: uuidv4(),
      reporter_id,
      post_id,
      reason,
      description: description || '',
      status: 'PENDING',
      resolution: null,
      reviewed_by: null,
      created_at: new Date(),
      reviewed_at: null
    };

    memoryStore.reports.push(report);

    return res.status(201).json({
      success: true,
      message: 'Reporte enviado a moderación. Gracias por contribuir a la comunidad académica.',
      report
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getReports = async (req, res) => {
  try {
    return res.json({ success: true, reports: memoryStore.reports });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createReport,
  getReports
};
