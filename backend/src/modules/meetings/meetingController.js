const { v4: uuidv4 } = require('uuid');
const { memoryStore } = require('../../config/db');
const { notifyUser } = require('../notifications/notificationController');

const getMeetings = async (req, res) => {
  try {
    const { group_id } = req.query;
    const currentUserId = req.user ? req.user.id : null;

    let meetings = memoryStore.group_meetings.filter(m => m.status === 'SCHEDULED');

    if (group_id) {
      meetings = meetings.filter(m => m.group_id === group_id);
    }

    // Privacidad: los encuentros de grupos privados solo son visibles para sus miembros
    const visibleGroupIds = new Set(
      memoryStore.study_groups
        .filter(g => {
          if (g.status !== 'ACTIVE') return false;
          if (g.group_type === 'PUBLIC') return true;
          if (!currentUserId) return false;
          return memoryStore.group_members.some(
            m => m.group_id === g.id && m.user_id === currentUserId && m.membership_status === 'ACTIVE'
          );
        })
        .map(g => g.id)
    );
    meetings = meetings.filter(m => visibleGroupIds.has(m.group_id));

    meetings.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    const enriched = meetings.map(meeting => {
      const group = memoryStore.study_groups.find(g => g.id === meeting.group_id);
      const attendees = memoryStore.meeting_attendees.filter(
        a => a.meeting_id === meeting.id && a.attendance_status === 'CONFIRMED'
      );

      let myRsvp = null;
      if (currentUserId) {
        const rsvpRecord = memoryStore.meeting_attendees.find(
          a => a.meeting_id === meeting.id && a.user_id === currentUserId
        );
        if (rsvpRecord) myRsvp = rsvpRecord.attendance_status;
      }

      return {
        id: meeting.id,
        group_id: meeting.group_id,
        group_name: group ? group.name : 'Grupo de Estudio',
        title: meeting.title,
        description: meeting.description,
        start_datetime: meeting.start_datetime,
        end_datetime: meeting.end_datetime,
        meeting_mode: meeting.meeting_mode,
        location: meeting.location,
        meeting_link: meeting.meeting_link,
        max_attendees: meeting.max_attendees,
        confirmed_count: attendees.length,
        my_rsvp: myRsvp,
        created_at: meeting.created_at
      };
    });

    return res.json({ success: true, meetings: enriched });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const createMeeting = async (req, res) => {
  try {
    const { group_id, title, description, start_datetime, end_datetime, meeting_mode, location, meeting_link, max_attendees } = req.body;
    const creator_id = req.user.id;

    if (!group_id || !title || !start_datetime) {
      return res.status(400).json({
        success: false,
        error: 'El grupo, título y fecha/hora de inicio son obligatorios.'
      });
    }

    const group = memoryStore.study_groups.find(g => g.id === group_id && g.status === 'ACTIVE');
    if (!group) {
      return res.status(404).json({ success: false, error: 'Grupo de estudio no encontrado.' });
    }

    // RN-15/16: Validar que el creador sea integrante activo o propietario del grupo
    const membership = memoryStore.group_members.find(
      m => m.group_id === group_id && m.user_id === creator_id && m.membership_status === 'ACTIVE'
    );
    if (!membership && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Solo los integrantes activos del grupo pueden programar encuentros académicos.'
      });
    }

    const meetingId = uuidv4();
    const newMeeting = {
      id: meetingId,
      group_id,
      creator_id,
      title: title.trim(),
      description: description ? description.trim() : '',
      start_datetime: new Date(start_datetime),
      end_datetime: end_datetime ? new Date(end_datetime) : null,
      meeting_mode: ['IN_PERSON', 'VIRTUAL', 'HYBRID'].includes(meeting_mode) ? meeting_mode : 'IN_PERSON',
      location: location || null,
      meeting_link: meeting_link || null,
      max_attendees: max_attendees ? Number(max_attendees) : null,
      status: 'SCHEDULED',
      created_at: new Date()
    };

    memoryStore.group_meetings.push(newMeeting);

    // Creador queda confirmado automáticamente
    memoryStore.meeting_attendees.push({
      id: uuidv4(),
      meeting_id: meetingId,
      user_id: creator_id,
      attendance_status: 'CONFIRMED',
      responded_at: new Date()
    });

    // Notificar a todos los miembros activos del grupo vía Web Push + In-App (excepto al creador)
    const activeMembers = memoryStore.group_members.filter(
      m => m.group_id === group_id && m.membership_status === 'ACTIVE' && m.user_id !== creator_id
    );

    for (const member of activeMembers) {
      await notifyUser(member.user_id, {
        title: '📅 Nuevo Encuentro Académico',
        message: `Se ha programado "${newMeeting.title}" en el grupo "${group.name}".`,
        url: '/groups',
        notification_type: 'MEETING_SCHEDULED',
        reference_type: 'MEETING',
        reference_id: meetingId
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Encuentro académico programado exitosamente.',
      meeting: newMeeting
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const rsvpMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const { attendance_status } = req.body; // 'CONFIRMED' | 'DECLINED'
    const userId = req.user.id;

    const meeting = memoryStore.group_meetings.find(m => m.id === id);
    if (!meeting) {
      return res.status(404).json({ success: false, error: 'Encuentro no encontrado.' });
    }

    // RN-22: Los encuentros cancelados no permitirán confirmación de asistencia
    if (meeting.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: 'No se puede confirmar asistencia a un encuentro académico que ha sido cancelado (RN-22).'
      });
    }

    // RN-16: Solo integrantes del grupo pueden confirmar asistencia
    const membership = memoryStore.group_members.find(
      m => m.group_id === meeting.group_id && m.user_id === userId && m.membership_status === 'ACTIVE'
    );
    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Debes pertenecer al grupo de estudio para confirmar asistencia a este encuentro.'
      });
    }

    const validStatuses = ['CONFIRMED', 'DECLINED', 'PENDING'];
    if (!validStatuses.includes(attendance_status)) {
      return res.status(400).json({ success: false, error: 'Estado de asistencia no válido.' });
    }

    // RN-23: Validación de cupo máximo de asistentes
    if (attendance_status === 'CONFIRMED') {
      const confirmedCount = memoryStore.meeting_attendees.filter(
        a => a.meeting_id === id && a.attendance_status === 'CONFIRMED' && a.user_id !== userId
      ).length;
      if (meeting.max_attendees && confirmedCount >= meeting.max_attendees) {
        return res.status(400).json({
          success: false,
          error: 'El encuentro académico ha alcanzado el cupo máximo de asistentes permitidos (RN-23).'
        });
      }
    }

    const existingRsvp = memoryStore.meeting_attendees.find(
      a => a.meeting_id === id && a.user_id === userId
    );

    if (existingRsvp) {
      existingRsvp.attendance_status = attendance_status;
      existingRsvp.responded_at = new Date();
    } else {
      memoryStore.meeting_attendees.push({
        id: uuidv4(),
        meeting_id: id,
        user_id: userId,
        attendance_status,
        responded_at: new Date()
      });
    }

    return res.json({
      success: true,
      message: `Asistencia actualizada a: ${attendance_status}`,
      attendance_status
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getMeetings,
  createMeeting,
  rsvpMeeting
};
