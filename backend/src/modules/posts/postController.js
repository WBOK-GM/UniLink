const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { pool, memoryStore, persistPost, updatePostStatus, persistPostRating, deletePostRating } = require('../../config/db');
const { getFileUrl, uploadFileToR2, deleteFileFromR2 } = require('../../config/storage');
const { recordFileAccess } = require('../../services/storageRetentionService');
const { notifyUser } = require('../notifications/notificationController');

const getContributionAccess = (user) => {
  const contributions_count = memoryStore.posts.filter(
    post => post.author_id === user.id && post.status === 'ACTIVE'
  ).length;

  return {
    contributions_count,
    can_access_downloads: user.role === 'ADMIN' || contributions_count > 0
  };
};

const resolvePostCategory = async (categoryId, categoryName) => {
  if (categoryId) return categoryId;

  const name = typeof categoryName === 'string' ? categoryName.trim() : '';
  if (!name || name.length > 100) {
    throw new Error('El nombre de la materia debe tener entre 1 y 100 caracteres.');
  }

  const normalizedName = name.toLowerCase().replace(/\s+/g, '-');
  let category = memoryStore.categories.find(
    (item) =>
      item.normalized_name === normalizedName &&
      !(item.parent_id || null) &&
      item.status === 'ACTIVE'
  );

  if (!category && pool) {
    const existing = await pool.query(
      `SELECT id, name, normalized_name, parent_id, status
       FROM categories
       WHERE normalized_name = $1 AND parent_id IS NULL AND status = 'ACTIVE'
       LIMIT 1`,
      [normalizedName]
    );
    category = existing.rows[0];

    if (!category) {
      const created = await pool.query(
        `INSERT INTO categories (name, normalized_name, status)
         VALUES ($1, $2, 'ACTIVE')
         RETURNING id, name, normalized_name, parent_id, status`,
        [name, normalizedName]
      );
      category = created.rows[0];
    }

    if (category && !memoryStore.categories.some((item) => item.id === category.id)) {
      memoryStore.categories.push(category);
    }
  }

  if (!category) {
    category = {
      id: uuidv4(),
      name,
      normalized_name: normalizedName,
      parent_id: null,
      status: 'ACTIVE',
      created_at: new Date()
    };
    memoryStore.categories.push(category);
  }

  return category.id;
};

const getPosts = async (req, res) => {
  try {
    const { category_id, group_id, search } = req.query;
    const currentUserId = req.user ? req.user.id : null;

    let activePosts = memoryStore.posts.filter(p => p.status === 'ACTIVE');

    // Filtro por grupo o publicaciones generales
    if (group_id) {
      activePosts = activePosts.filter(p => p.group_id === group_id);
    } else {
      // Por defecto en el feed general solo mostramos posts sin grupo (generales) o de grupos públicos
      activePosts = activePosts.filter(p => {
        if (!p.group_id) return true;
        const group = memoryStore.study_groups.find(g => g.id === p.group_id);
        return group && group.group_type === 'PUBLIC';
      });
    }

    // Filtro por categoría
    if (category_id) {
      activePosts = activePosts.filter(p => p.category_id === category_id);
    }

    // Filtro por búsqueda de texto
    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      activePosts = activePosts.filter(
        p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
      );
    }

    // Ordenar de más reciente a más antiguo
    activePosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Enriquecer cada publicación con autor, archivos y reacciones
    const enrichedPosts = activePosts.map(post => {
      const authorUser = memoryStore.users.find(u => u.id === post.author_id);
      const authorProfile = memoryStore.profiles.find(p => p.user_id === post.author_id) || {};
      const category = memoryStore.categories.find(c => c.id === post.category_id);

      // Archivos asociados
      const postFilesRels = memoryStore.post_files.filter(pf => pf.post_id === post.id);
      const attachments = postFilesRels.map(rel => {
        const fileObj = memoryStore.files.find(f => f.id === rel.file_id);
        if (!fileObj) return null;
        return {
          id: fileObj.id,
          original_name: fileObj.original_name,
          url: getFileUrl(fileObj.storage_key),
          mime_type: fileObj.mime_type,
          file_size: fileObj.file_size,
          file_type: fileObj.file_type
        };
      }).filter(Boolean);

      // Reacciones (útil/no útil)
      const postReactions = memoryStore.post_reactions.filter(r => r.post_id === post.id);
      const likesCount = postReactions.filter(r => r.reaction_type === 'LIKE').length;
      const dislikesCount = postReactions.filter(r => r.reaction_type === 'DISLIKE').length;
      const myReaction = currentUserId
        ? (postReactions.find(r => r.user_id === currentUserId) || {}).reaction_type || null
        : null;

      // Calificación real de 1 a 5 estrellas
      const postRatings = memoryStore.post_ratings.filter(r => r.post_id === post.id);
      const ratingsCount = postRatings.length;
      const averageRating = ratingsCount > 0
        ? Number((postRatings.reduce((sum, r) => sum + r.rating, 0) / ratingsCount).toFixed(1))
        : null;
      const myRating = currentUserId
        ? (postRatings.find(r => r.user_id === currentUserId) || {}).rating || null
        : null;

      return {
        id: post.id,
        author: {
          id: post.author_id,
          full_name: authorProfile.full_name || 'Estudiante UniLink',
          university: authorProfile.university || '',
          academic_program: authorProfile.academic_program || ''
        },
        category: category ? { id: category.id, name: category.name } : null,
        group_id: post.group_id,
        post_type: post.post_type,
        title: post.title,
        content: post.content,
        location: post.location,
        status: post.status,
        attachments,
        likes_count: likesCount,
        dislikes_count: dislikesCount,
        average_rating: averageRating,
        ratings_count: ratingsCount,
        my_rating: myRating,
        my_reaction: myReaction,
        client_operation_id: post.client_operation_id,
        created_at: post.created_at
      };
    });

    return res.json({ success: true, posts: enrichedPosts });
  } catch (error) {
    console.error('Error en getPosts:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const createPost = async (req, res) => {
  const files = req.files || [];
  const uploadedKeys = [];
  let preserveAttachments = false;
  try {
    const {
      title,
      content,
      category_id,
      category_name,
      group_id,
      post_type,
      location,
      client_operation_id,
      copyright_declaration_accepted
    } = req.body;

    const author_id = req.user.id;

    // RN-17: Idempotencia para sincronización offline
    const opId = client_operation_id || uuidv4();
    const findExistingPost = () => memoryStore.posts.find(post => post.client_operation_id === opId);
    const respondToDuplicate = (existingPost) => {
      if (existingPost.author_id !== author_id) {
        return res.status(409).json({ success: false, error: 'El identificador de publicación ya está en uso.' });
      }
      return res.status(200).json({
        success: true,
        alreadyProcessed: true,
        message: 'Publicación sincronizada previamente (idempotente).',
        contribution_access: getContributionAccess(req.user),
        post: existingPost
      });
    };

    const existingPost = findExistingPost();
    if (existingPost) return respondToDuplicate(existingPost);
    if (!pool && process.env.NODE_ENV === 'production') {
      return res.status(503).json({ success: false, error: 'El almacenamiento de publicaciones no está disponible.' });
    }
    if (files.length && process.env.RENDER_EXTERNAL_URL && !process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN) {
      return res.status(503).json({ success: false, error: 'El almacenamiento permanente de archivos no está configurado.' });
    }

    if (
      typeof title !== 'string' ||
      !title.trim() ||
      typeof content !== 'string' ||
      !content.trim() ||
      (!category_id &&
        (typeof category_name !== 'string' || !category_name.trim()))
    ) {
      return res.status(400).json({
        success: false,
        error: 'El título, contenido y categoría son obligatorios.'
      });
    }
      return res.status(400).json({
        success: false,
        error: 'El título, contenido y categoría son obligatorios.'
      });
    }
    if (
      !category_id &&
      (typeof category_name !== 'string' || !category_name.trim() || category_name.trim().length > 100)
    ) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la materia debe tener entre 1 y 100 caracteres.'
      });
    }

    if (files.length === 0 && content.trim().length < 255) {
      return res.status(400).json({
        success: false,
        error: 'Las publicaciones solo de texto deben tener al menos 255 caracteres.'
      });
    }

    // RN-30: Validación obligatoria de declaración de derechos de autor
    if (copyright_declaration_accepted !== true && copyright_declaration_accepted !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Debes aceptar la declaración de propiedad intelectual y autorizaciones para publicar.'
      });
    }

    const category = memoryStore.categories.find(item => item.id === category_id);
    if (!category || title.trim().length > 200 || (location && (typeof location !== 'string' || location.length > 200)) ||
        (post_type && !['RESOURCE', 'GENERAL'].includes(post_type)) || typeof opId !== 'string') {
      return res.status(400).json({ success: false, error: 'Los datos de la publicación no son válidos.' });
    }

    // Si pertenece a un grupo privado, verificar membresía activa (RN-24)
    if (group_id) {
      const membership = memoryStore.group_members.find(
        m => m.group_id === group_id && m.user_id === author_id && m.membership_status === 'ACTIVE'
      );
      if (!membership) {
        return res.status(403).json({
          success: false,
          error: 'Solo los integrantes activos pueden publicar dentro del grupo.'
        });
      }
    }

    const resolvedCategoryId = await resolvePostCategory(category_id, category_name);
    const postId = uuidv4();
    const newPost = {
      id: postId,
      author_id,
      category_id: resolvedCategoryId,
      group_id: group_id || null,
      post_type: post_type || 'RESOURCE',
      title: title.trim(),
      content: content.trim(),
      status: 'ACTIVE',
      location: location || null,
      copyright_declaration_accepted: true,
      copyright_policy_version: 'v1.0',
      client_operation_id: opId,
      created_at: new Date(),
      updated_at: new Date()
    };

    const fileRecords = [];
    const links = [];
    for (const [index, file] of files.entries()) {
      const fileBuffer = await fs.promises.readFile(file.path);
      const calculatedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const clientChecksum = req.body[`file_checksum_${index}`] || req.body[`checksum_${index}`];
      if (clientChecksum) {
        const cleanClientHash = String(clientChecksum).replace(/^sha256:/i, '').trim().toLowerCase();
        if (cleanClientHash && cleanClientHash !== calculatedHash) {
          return res.status(400).json({
            success: false,
            error: `Integridad comprometida: El archivo "${file.originalname}" está corrupto (Fallo de verificación SHA-256).`,
            expectedChecksum: cleanClientHash,
            receivedChecksum: calculatedHash
          });
        }
      }

      const fileRecord = {
        id: uuidv4(),
        uploader_id: author_id,
        original_name: file.originalname,
        storage_key: file.filename,
        mime_type: file.mimetype,
        file_size: file.size,
        file_type: file.mimetype.startsWith('image/') ? 'IMAGE'
          : file.mimetype.startsWith('audio/') ? 'AUDIO' : 'DOCUMENT',
        checksum: `sha256:${calculatedHash}`,
        status: 'AVAILABLE',
        access_count: 1,
        last_accessed_at: new Date(),
        created_at: new Date()
      };
      fileRecords.push(fileRecord);
      links.push({ id: uuidv4(), post_id: postId, file_id: fileRecord.id, display_order: index + 1 });
    }

    for (const file of files) {
      const upload = await uploadFileToR2(file.path, file.filename, file.mimetype);
      if (upload.mode === 'r2') uploadedKeys.push(file.filename);
      if (!upload.success || (process.env.RENDER_EXTERNAL_URL && upload.mode !== 'r2')) {
        return res.status(503).json({ success: false, error: 'No se pudo guardar el archivo de forma permanente.' });
      }
    }

    const duplicate = pool ? await persistPost(newPost, fileRecords, links, category) : findExistingPost();
    if (duplicate) return respondToDuplicate(duplicate);

    memoryStore.posts.push(newPost);
    memoryStore.files.push(...fileRecords);
    memoryStore.post_files.push(...links);
    preserveAttachments = true;

    const attachments = fileRecords.map(file => ({
      id: file.id,
      original_name: file.original_name,
      url: getFileUrl(file.storage_key),
      mime_type: file.mime_type,
      file_type: file.file_type,
      checksum: file.checksum,
      file_size: file.file_size
    }));

    return res.status(201).json({
      success: true,
      message: 'Publicación creada exitosamente.',
      contribution_access: getContributionAccess(req.user),
      post: {
        ...newPost,
        attachments
      }
    });
  } catch (error) {
    preserveAttachments ||= error.preserveAttachments === true;
    console.error('Error en createPost:', error);
    return res.status(500).json({ success: false, error: 'No se pudo guardar la publicación.' });
  } finally {
    if (!preserveAttachments) {
      const cleanup = await Promise.allSettled([
        ...files.map(file => fs.promises.rm(file.path, { force: true })),
        ...uploadedKeys.map(deleteFileFromR2)
      ]);
      for (const result of cleanup) {
        if (result.status === 'rejected') console.warn('No se pudo limpiar un adjunto:', result.reason.message);
      }
    }
  }
};

const reactToPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { reaction_type } = req.body; // 'LIKE' | 'DISLIKE' | 'NONE'
    const userId = req.user.id;

    const post = memoryStore.posts.find(p => p.id === id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Publicación no encontrada.' });
    }

    // RN-04: El autor no podrá reaccionar a sus propias publicaciones
    if (post.author_id === userId) {
      return res.status(400).json({
        success: false,
        error: 'El autor no puede reaccionar a su propia publicación.'
      });
    }

    // RN-05: Un usuario solo podrá tener una reacción activa por publicación
    const existingIndex = memoryStore.post_reactions.findIndex(
      r => r.post_id === id && r.user_id === userId
    );

    if (reaction_type === 'NONE' || (existingIndex >= 0 && memoryStore.post_reactions[existingIndex].reaction_type === reaction_type)) {
      // Retirar reacción
      if (existingIndex >= 0) {
        memoryStore.post_reactions.splice(existingIndex, 1);
      }
      return res.json({ success: true, message: 'Reacción retirada.', current_reaction: null });
    }

    if (!['LIKE', 'DISLIKE'].includes(reaction_type)) {
      return res.status(400).json({ success: false, error: 'Tipo de reacción inválido (LIKE o DISLIKE).' });
    }

    if (existingIndex >= 0) {
      // Cambiar reacción
      memoryStore.post_reactions[existingIndex].reaction_type = reaction_type;
      memoryStore.post_reactions[existingIndex].updated_at = new Date();
    } else {
      // Nueva reacción
      memoryStore.post_reactions.push({
        id: uuidv4(),
        post_id: id,
        user_id: userId,
        reaction_type,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // Notificar al autor vía Web Push y notificación in-app
    const reactionLabel = reaction_type === 'LIKE' ? 'reaccionó positivamente a' : 'calificó';
    notifyUser(post.author_id, {
      title: '⭐ Nueva Calificación en tu Apunte',
      message: `Un compañero ${reactionLabel} tu publicación "${post.title}".`,
      url: '/',
      notification_type: 'POST_REACTION',
      reference_type: 'POST',
      reference_id: post.id
    }).catch(err => console.warn('[Push Post Reaction Error]:', err.message));

    return res.json({
      success: true,
      message: 'Reacción registrada correctamente.',
      current_reaction: reaction_type
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const ratePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const rating = Number(req.body.rating);

    const post = memoryStore.posts.find(p => p.id === id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Publicación no encontrada.' });
    }

    // RN-04: El autor no puede calificar su propia publicación
    if (post.author_id === userId) {
      return res.status(400).json({
        success: false,
        error: 'El autor no puede calificar su propia publicación.'
      });
    }

    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      return res.status(400).json({ success: false, error: 'La calificación debe ser un entero entre 1 y 5.' });
    }

    const existingIndex = memoryStore.post_ratings.findIndex(
      r => r.post_id === id && r.user_id === userId
    );

    // Retirar calificación si envía 0 o vuelve a pulsar la misma estrella
    if (rating === 0 || (existingIndex >= 0 && memoryStore.post_ratings[existingIndex].rating === rating)) {
      if (existingIndex >= 0) {
        memoryStore.post_ratings.splice(existingIndex, 1);
        deletePostRating(id, userId).catch(() => {});
      }
    } else if (existingIndex >= 0) {
      memoryStore.post_ratings[existingIndex].rating = rating;
      memoryStore.post_ratings[existingIndex].updated_at = new Date();
      persistPostRating(memoryStore.post_ratings[existingIndex]).catch(() => {});
    } else {
      const record = {
        id: uuidv4(),
        post_id: id,
        user_id: userId,
        rating,
        created_at: new Date(),
        updated_at: new Date()
      };
      memoryStore.post_ratings.push(record);
      persistPostRating(record).catch(() => {});
    }

    const ratings = memoryStore.post_ratings.filter(r => r.post_id === id);
    const ratingsCount = ratings.length;
    const averageRating = ratingsCount > 0
      ? Number((ratings.reduce((sum, r) => sum + r.rating, 0) / ratingsCount).toFixed(1))
      : null;
    const mine = ratings.find(r => r.user_id === userId);

    return res.json({
      success: true,
      average_rating: averageRating,
      ratings_count: ratingsCount,
      my_rating: mine ? mine.rating : null
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const deactivatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const post = memoryStore.posts.find(p => p.id === id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Publicación no encontrada.' });
    }

    // RN-06: Solo el autor o un administrador podrá desactivar una publicación
    if (post.author_id !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para desactivar esta publicación.'
      });
    }

    await updatePostStatus(post, 'INACTIVE');

    return res.json({ success: true, message: 'Publicación desactivada correctamente.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const reactivatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const post = memoryStore.posts.find(p => p.id === id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Publicación no encontrada.' });
    }

    // RF-11: El autor podrá consultar sus publicaciones desactivadas y reactivarlas (o ADMIN)
    if (post.author_id !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Solo el autor o un administrador puede reactivar esta publicación.'
      });
    }

    await updatePostStatus(post, 'ACTIVE');

    return res.json({
      success: true,
      message: 'Publicación reactivada exitosamente.',
      post
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getPosts,
  createPost,
  reactToPost,
  ratePost,
  deactivatePost,
  reactivatePost
};
