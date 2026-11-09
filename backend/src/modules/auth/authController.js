const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { memoryStore, pool, usePg } = require('../../config/db');
const { JWT_SECRET } = require('../../middlewares/auth');

const register = async (req, res) => {
  try {
    const { email, password, full_name, university, academic_program, semester, latitude, longitude } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        error: 'El correo, contraseña y nombre completo son obligatorios.'
      });
    }

    // RN-01: Correo electrónico único
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = memoryStore.users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'El correo electrónico ya se encuentra registrado.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const userId = uuidv4();
    const profileId = uuidv4();
    const newUser = {
      id: userId,
      email: normalizedEmail,
      password_hash,
      role: 'STUDENT',
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date()
    };

    const newProfile = {
      id: profileId,
      user_id: userId,
      full_name,
      biography: req.body.biography || '',
      avatar_file_id: null,
      university: university || 'Universidad Nacional',
      academic_program: academic_program || 'Ingeniería de Sistemas',
      semester: Number(semester) || 1,
      latitude: Number(latitude) || 4.60971, // RN-12: Privada de referencia
      longitude: Number(longitude) || -74.08175,
      location_updated_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };

    memoryStore.users.push(newUser);
    memoryStore.profiles.push(newProfile);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente en UniLink.',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        profile: {
          id: newProfile.id,
          full_name: newProfile.full_name,
          university: newProfile.university,
          academic_program: newProfile.academic_program,
          semester: newProfile.semester,
          biography: newProfile.biography,
          latitude: newProfile.latitude,
          longitude: newProfile.longitude
        }
      }
    });
  } catch (error) {
    console.error('Error en register:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor al registrar.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Ingresa correo y contraseña.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = memoryStore.users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas. Correo o contraseña errónea.'
      });
    }

    // Comprobación de password (soporta pass de prueba '123456' o hash)
    let isMatch = false;
    if (password === '123456' || password === 'admin123') {
      isMatch = true;
    } else {
      isMatch = await bcrypt.compare(password, user.password_hash);
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas. Contraseña incorrecta.'
      });
    }

    const profile = memoryStore.profiles.find(p => p.user_id === user.id) || {};

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: {
          id: profile.id,
          full_name: profile.full_name,
          university: profile.university,
          academic_program: profile.academic_program,
          semester: profile.semester,
          biography: profile.biography,
          latitude: profile.latitude,
          longitude: profile.longitude
        }
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ success: false, error: 'Error interno al autenticar.' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = memoryStore.users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
    }

    const profile = memoryStore.profiles.find(p => p.user_id === user.id) || {};

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile
      }
    });
  } catch (error) {
    console.error('Error en getMe:', error);
    return res.status(500).json({ success: false, error: 'Error al consultar perfil actual.' });
  }
};

module.exports = {
  register,
  login,
  getMe
};
