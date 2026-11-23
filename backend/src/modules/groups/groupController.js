const { v4: uuidv4 } = require('uuid');
const { memoryStore } = require('../../config/db');
const { calculateHaversineDistance } = require('../../utils/haversine');
const { notifyUser } = require('../notifications/notificationController');

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

    // RN-23: Validación de cupo máximo de miembros al unirse
    const activeMembers = memoryStore.group_members.filter(
      m => m.group_id === id && m.membership_status === 'ACTIVE'
    );
    if (group.max_members && activeMembers.length >= group.max_members) {
      return res.status(400).json({
        success: false,
        error: 'El grupo de estudio ha alcanzado el cupo máximo de miembros permitidos (RN-23).'
      });
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

    // Si es privado, notificar al creador del grupo mediante Web Push y notificación interna
    if (!isPublic) {
      const applicantProfile = memoryStore.profiles.find(p => p.user_id === userId);
      const applicantName = applicantProfile?.full_name || 'Un estudiante';
      await notifyUser(group.creator_id, {
        title: '👥 Nueva Solicitud de Ingreso',
        message: `${applicantName} solicitó unirse a tu grupo de estudio "${group.name}".`,
        url: '/groups',
        notification_type: 'GROUP_REQUEST',
        reference_type: 'GROUP',
        reference_id: group.id
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

const respondJoinRequest = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { action } = req.body; // 'APPROVE' | 'REJECT'
    const currentUserId = req.user.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Acción no válida. Usa APPROVE o REJECT.' });
    }

    const group = memoryStore.study_groups.find(g => g.id === id);
    if (!group) return res.status(404).json({ success: false, error: 'Grupo no encontrado.' });

    // Verificar permisos: creador, rol OWNER o ADMIN
    const isOwner = group.creator_id === currentUserId;
    const myMembership = memoryStore.group_members.find(
      m => m.group_id === id && m.user_id === currentUserId && (m.member_role === 'OWNER' || m.member_role === 'MODERATOR')
    );

    if (!isOwner && !myMembership && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'No tienes permisos para moderar este grupo.' });
    }

    const membership = memoryStore.group_members.find(
      m => m.group_id === id && m.user_id === memberId
    );

    if (!membership) {
      return res.status(404).json({ success: false, error: 'Solicitud de membresía no encontrada.' });
    }

    if (membership.membership_status !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Esta membresía no tiene una solicitud pendiente de aprobación.' });
    }

    if (action === 'APPROVE') {
      membership.membership_status = 'ACTIVE';
      membership.joined_at = new Date();

      await notifyUser(memberId, {
        title: '🎉 Solicitud Aceptada',
        message: `Tu solicitud para unirte al grupo "${group.name}" ha sido aprobada. ¡Ya puedes participar!`,
        url: '/groups',
        notification_type: 'GROUP_APPROVED',
        reference_type: 'GROUP',
        reference_id: group.id
      });

      return res.json({ success: true, message: 'Solicitud aprobada exitosamente.' });
    } else {
      membership.membership_status = 'REJECTED';
      return res.json({ success: true, message: 'Solicitud rechazada.' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = memoryStore.study_groups.find(g => g.id === id);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Grupo no encontrado.' });
    }

    const membership = memoryStore.group_members.find(
      m => m.group_id === id && m.user_id === userId
    );

    if (!membership || membership.membership_status === 'LEFT') {
      return res.status(400).json({ success: false, error: 'No eres integrante de este grupo.' });
    }

    // RF-20: Un miembro activo puede retirarse voluntariamente.
    // El propietario (OWNER) no puede abandonar el grupo sin transferir previamente la propiedad o eliminar el grupo.
    if (membership.member_role === 'OWNER') {
      return res.status(400).json({
        success: false,
        error: 'El propietario no puede abandonar el grupo sin transferir previamente la propiedad o eliminar el grupo (RF-20).'
      });
    }

    membership.membership_status = 'LEFT';

    return res.json({
      success: true,
      message: 'Has abandonado el grupo de estudio voluntariamente.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
  joinGroup,
  leaveGroup,
  respondJoinRequest
};
