const { memoryStore } = require('../../config/db');

const getProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = memoryStore.profiles.find(p => p.user_id === id);

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Perfil no encontrado.' });
    }

    const isOwner = req.user && req.user.id === id;

    // RN-12: La ubicación del perfil es estrictamente privada y nunca se expone a terceros
    const sanitizedProfile = {
      id: profile.id,
      user_id: profile.user_id,
      full_name: profile.full_name,
      biography: profile.biography,
      university: profile.university,
      academic_program: profile.academic_program,
      semester: profile.semester,
      created_at: profile.created_at,
      ...(isOwner ? { latitude: profile.latitude, longitude: profile.longitude } : {})
    };

    return res.json({ success: true, profile: sanitizedProfile });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = memoryStore.profiles.find(p => p.user_id === userId);

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Perfil no encontrado.' });
    }

    const { full_name, biography, university, academic_program, semester, latitude, longitude } = req.body;

    if (full_name) profile.full_name = full_name;
    if (biography !== undefined) profile.biography = biography;
    if (university) profile.university = university;
    if (academic_program) profile.academic_program = academic_program;
    if (semester !== undefined) profile.semester = Number(semester);
    if (latitude !== undefined && longitude !== undefined) {
      profile.latitude = Number(latitude);
      profile.longitude = Number(longitude);
      profile.location_updated_at = new Date();
    }
    profile.updated_at = new Date();

    return res.json({
      success: true,
      message: 'Perfil actualizado exitosamente.',
      profile
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile
};
