const { v4: uuidv4 } = require('uuid');
const { memoryStore, updatePostStatus } = require('../../config/db');

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

const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, resolution } = req.body; // 'DISMISS' | 'HIDE_POST' | 'DEACTIVATE_POST'
    const reviewerId = req.user.id;

    if (!['DISMISS', 'HIDE_POST', 'DEACTIVATE_POST'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Acción no válida. Opciones permitidas: DISMISS, HIDE_POST, DEACTIVATE_POST.'
      });
    }

    const report = memoryStore.reports.find(r => r.id === id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Reporte no encontrado.' });
    }

    // Medidas sobre la publicación académica (RF-32 / RN-21)
    const post = memoryStore.posts.find(p => p.id === report.post_id);
    if (post && action !== 'DISMISS') {
      await updatePostStatus(post, action === 'HIDE_POST' ? 'HIDDEN' : 'INACTIVE');
    }

    report.status = 'RESOLVED';
    report.resolution = resolution || action;
    report.reviewed_by = reviewerId;
    report.reviewed_at = new Date();

    return res.json({
      success: true,
      message: `Reporte resuelto con medida: ${action}`,
      report
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createReport,
  getReports,
  resolveReport
};
