const { v4: uuidv4 } = require('uuid');
const { memoryStore } = require('../../config/db');
const { calculateHaversineDistance } = require('../../utils/haversine');

const getGroups = async (req, res) => {
  try {
    const { category_id, search, lat, lng, radius_km } = req.query;
    const currentUserId = req.user ? req.user.id : null;

    let groups = memoryStore.study_groups.filter(g => g.status === 'ACTIVE');

    if (category_id) {
      groups = groups.filter(g => g.category_id === category_id);
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      groups = groups.filter(
        g => g.name.toLowerCase().includes(q) || (g.description && g.description.toLowerCase().includes(q))
      );
    }

    // Ubicación de referencia para calcular distancia con Haversine
    let refLat = lat ? Number(lat) : null;
    let refLng = lng ? Number(lng) : null;

    // Si no se pasó lat/lng explícito pero el usuario está autenticado, usar la de su perfil
    if ((refLat === null || refLng === null) && currentUserId) {
      const profile = memoryStore.profiles.find(p => p.user_id === currentUserId);
      if (profile) {
        refLat = profile.latitude;
        refLng = profile.longitude;
      }
    }

    const enrichedGroups = groups.map(group => {
      const category = memoryStore.categories.find(c => c.id === group.category_id);
      const members = memoryStore.group_members.filter(
        m => m.group_id === group.id && m.membership_status === 'ACTIVE'
      );

      let myMembership = null;
      if (currentUserId) {
        const mem = memoryStore.group_members.find(
          m => m.group_id === group.id && m.user_id === currentUserId
        );
        if (mem) {
          myMembership = {
            role: mem.member_role,
            status: mem.membership_status
          };
        }
      }

      let distance_km = null;
      if (refLat !== null && refLng !== null) {
        distance_km = calculateHaversineDistance(
          refLat,
          refLng,
          group.location_latitude,
          group.location_longitude
        );
      }

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        group_type: group.group_type,
        location: {
          latitude: group.location_latitude,
          longitude: group.location_longitude
        },
        distance_km,
        category: category ? { id: category.id, name: category.name } : null,
        members_count: members.length,
        max_members: group.max_members,
        my_membership: myMembership,
        created_at: group.created_at
      };
    });

    // Filtrar por radio si se especificó
    let results = enrichedGroups;
    if (radius_km && !isNaN(Number(radius_km))) {
      const maxR = Number(radius_km);
      results = results.filter(g => g.distance_km === null || g.distance_km <= maxR);
    }

    // Ordenar por distancia si está disponible
    if (refLat !== null && refLng !== null) {
      results.sort((a, b) => {
        if (a.distance_km === null) return 1;
        if (b.distance_km === null) return -1;
        return a.distance_km - b.distance_km;
      });
    }

    return res.json({
      success: true,
      reference_point: refLat !== null ? { lat: refLat, lng: refLng } : null,
      groups: results
    });
  } catch (error) {
    console.error('Error en getGroups:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user ? req.user.id : null;

    const group = memoryStore.study_groups.find(g => g.id === id && g.status === 'ACTIVE');
    if (!group) {
      return res.status(404).json({ success: false, error: 'Grupo de estudio no encontrado.' });
    }

    const category = memoryStore.categories.find(c => c.id === group.category_id);
    const members = memoryStore.group_members.filter(
      m => m.group_id === group.id && m.membership_status === 'ACTIVE'
    );

    let myMembership = null;
    if (currentUserId) {
      const mem = memoryStore.group_members.find(
        m => m.group_id === group.id && m.user_id === currentUserId
      );
      if (mem) {
        myMembership = { role: mem.member_role, status: mem.membership_status };
      }
    }

    // Encuentros del grupo
    const meetings = memoryStore.group_meetings.filter(
      m => m.group_id === id && m.status === 'SCHEDULED'
    );

    return res.json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        group_type: group.group_type,
        location: {
          latitude: group.location_latitude,
          longitude: group.location_longitude
        },
        category: category ? { id: category.id, name: category.name } : null,
        members_count: members.length,
        max_members: group.max_members,
        my_membership: myMembership,
        meetings_count: meetings.length,
        created_at: group.created_at
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const createGroup = async (req, res) => {
  try {
    const { name, description, category_id, group_type, location_latitude, location_longitude, max_members } = req.body;
    const creator_id = req.user.id;

    if (!name || !category_id || location_latitude === undefined || location_longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'El nombre, categoría y ubicación geográfica del grupo son obligatorios.'
      });
    }

    const groupId = uuidv4();
    const newGroup = {
      id: groupId,
      creator_id,
      category_id,
      name: name.trim(),
      description: description ? description.trim() : '',
      group_type: ['PUBLIC', 'PRIVATE'].includes(group_type) ? group_type : 'PUBLIC',
      location_latitude: Number(location_latitude),
      location_longitude: Number(location_longitude),
      max_members: Number(max_members) || 50,
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date()
    };

    memoryStore.study_groups.push(newGroup);

    // Creador se convierte automáticamente en OWNER con membresía ACTIVA
    memoryStore.group_members.push({
      id: uuidv4(),
      group_id: groupId,
      user_id: creator_id,
      member_role: 'OWNER',
      membership_status: 'ACTIVE',
      joined_at: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Grupo de estudio creado exitosamente.',
      group: newGroup
    });
  } catch (error) {
    console.error('Error en createGroup:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const joinGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = memoryStore.study_groups.find(g => g.id === id && g.status === 'ACTIVE');
    if (!group) {
      return res.status(404).json({ success: false, error: 'Grupo no encontrado.' });
    }

    // Verificar si ya tiene membresía
    const existingMembership = memoryStore.group_members.find(
      m => m.group_id === id && m.user_id === userId
    );

    if (existingMembership) {
      if (existingMembership.membership_status === 'ACTIVE') {
        return res.status(400).json({ success: false, error: 'Ya eres integrante activo de este grupo.' });
      }
      if (existingMembership.membership_status === 'PENDING') {
        return res.status(400).json({ success: false, error: 'Ya tienes una solicitud de ingreso pendiente de aprobación.' });
      }
    }

    // RN-09: En grupos públicos el ingreso es directo
    // RN-10: En grupos privados requiere aprobación
    const isPublic = group.group_type === 'PUBLIC';
    const status = isPublic ? 'ACTIVE' : 'PENDING';

    if (existingMembership) {
      existingMembership.membership_status = status;
      existingMembership.joined_at = new Date();
    } else {
      memoryStore.group_members.push({
        id: uuidv4(),
        group_id: id,
        user_id: userId,
        member_role: 'MEMBER',
        membership_status: status,
        joined_at: new Date()
      });
    }

    // Si es privado, notificar al creador del grupo
    if (!isPublic) {
      memoryStore.notifications.push({
        id: uuidv4(),
        user_id: group.creator_id,
        notification_type: 'GROUP_REQUEST',
        title: 'Nueva solicitud de ingreso',
        message: `Un estudiante solicitó unirse al grupo ${group.name}.`,
        reference_type: 'GROUP',
        reference_id: group.id,
        is_read: false,
        created_at: new Date()
      });
    }

    return res.json({
      success: true,
      membership_status: status,
      message: isPublic
        ? '¡Te has unido exitosamente al grupo de estudio!'
        : 'Solicitud enviada al administrador del grupo. Te notificaremos cuando sea aprobada.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
  joinGroup
};
