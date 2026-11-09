const { v4: uuidv4 } = require('uuid');
const { memoryStore } = require('../../config/db');
const { getFileUrl } = require('../../config/storage');

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

      // Reacciones
      const postReactions = memoryStore.post_reactions.filter(r => r.post_id === post.id);
      const likesCount = postReactions.filter(r => r.reaction_type === 'LIKE').length;
      const dislikesCount = postReactions.filter(r => r.reaction_type === 'DISLIKE').length;
      const myReaction = currentUserId
        ? (postReactions.find(r => r.user_id === currentUserId) || {}).reaction_type || null
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
  try {
    const {
      title,
      content,
      category_id,
      group_id,
      post_type,
      location,
      client_operation_id,
      copyright_declaration_accepted
    } = req.body;

    const author_id = req.user.id;

    // RN-17: Idempotencia para sincronización offline
    const opId = client_operation_id || uuidv4();
    const existingPost = memoryStore.posts.find(p => p.client_operation_id === opId);
    if (existingPost) {
      return res.status(200).json({
        success: true,
        alreadyProcessed: true,
        message: 'Publicación sincronizada previamente (idempotente).',
        post: existingPost
      });
    }

    if (!title || !content || !category_id) {
      return res.status(400).json({
        success: false,
        error: 'El título, contenido y categoría son obligatorios.'
      });
    }

    // RN-30: Validación obligatoria de declaración de derechos de autor
    if (copyright_declaration_accepted !== true && copyright_declaration_accepted !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Debes aceptar la declaración de propiedad intelectual y autorizaciones para publicar.'
      });
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

    const postId = uuidv4();
    const newPost = {
      id: postId,
      author_id,
      category_id,
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

    memoryStore.posts.push(newPost);

    // Si se adjuntaron archivos mediante Multer
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        let fileType = 'DOCUMENT';
        if (file.mimetype.startsWith('image/')) fileType = 'IMAGE';
        else if (file.mimetype.startsWith('audio/')) fileType = 'AUDIO';

        const fileId = uuidv4();
        const fileRecord = {
          id: fileId,
          uploader_id: author_id,
          original_name: file.originalname,
          storage_key: file.filename,
          mime_type: file.mimetype,
          file_size: file.size,
          file_type: fileType,
          status: 'AVAILABLE',
          created_at: new Date()
        };

        memoryStore.files.push(fileRecord);
        memoryStore.post_files.push({
          id: uuidv4(),
          post_id: postId,
          file_id: fileId,
          display_order: index + 1
        });

        attachments.push({
          id: fileRecord.id,
          original_name: fileRecord.original_name,
          url: getFileUrl(fileRecord.storage_key),
          mime_type: fileRecord.mime_type,
          file_type: fileRecord.file_type
        });
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Publicación creada exitosamente.',
      post: {
        ...newPost,
        attachments
      }
    });
  } catch (error) {
    console.error('Error en createPost:', error);
    return res.status(500).json({ success: false, error: error.message });
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

    return res.json({
      success: true,
      message: 'Reacción registrada correctamente.',
      current_reaction: reaction_type
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

    post.status = 'INACTIVE';
    post.updated_at = new Date();

    return res.json({ success: true, message: 'Publicación desactivada correctamente.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getPosts,
  createPost,
  reactToPost,
  deactivatePost
};
