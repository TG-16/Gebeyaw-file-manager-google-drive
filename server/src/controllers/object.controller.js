const { pool } = require('../config/db');
const { uploadMediaFile, deleteMediaFile } = require('../services/drive.service');

/**
 * Get single object with all its media files
 */
async function getObject(req, res, next) {
  try {
    const userId = req.user.id;
    const objectId = req.params.id;

    const [objectRows] = await pool.query(`
      SELECT o.id, o.folder_id, o.title, o.note, o.created_at, o.updated_at,
             f.name AS folder_name,
             os.token AS share_token, os.allow_download AS share_allow_download
      FROM objects o
      JOIN folders f ON f.id = o.folder_id
      LEFT JOIN object_shares os ON os.object_id = o.id
      WHERE o.id = ? AND o.user_id = ? AND o.deleted_at IS NULL
    `, [objectId, userId]);

    if (objectRows.length === 0) {
      return res.status(404).json({ error: 'Object not found.' });
    }

    const object = objectRows[0];

    const [mediaRows] = await pool.query(`
      SELECT id, object_id, original_name, mime_type, file_size_bytes, media_type, thumbnail_url, created_at
      FROM media_files
      WHERE object_id = ? AND user_id = ? AND deleted_at IS NULL
      ORDER BY created_at ASC
    `, [objectId, userId]);

    object.media = mediaRows;
    res.json({ object });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new object (title required, note or media optional but at least one must be present on save)
 */
async function createObject(req, res, next) {
  try {
    const userId = req.user.id;
    const { folderId, title, note } = req.body;
    const files = req.files || [];

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Object title is required.' });
    }

    if (!folderId) {
      return res.status(400).json({ error: 'Folder ID is required.' });
    }

    const hasNote = note && note.trim().length > 0;
    const hasFiles = files.length > 0;

    if (!hasNote && !hasFiles) {
      return res.status(400).json({
        error: 'An object must contain at least a note or one media file.'
      });
    }

    // Verify folder ownership
    const [folderRows] = await pool.query(
      'SELECT id FROM folders WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [folderId, userId]
    );

    if (folderRows.length === 0) {
      return res.status(404).json({ error: 'Target folder not found.' });
    }

    // Insert object
    const [result] = await pool.query(
      'INSERT INTO objects (user_id, folder_id, title, note) VALUES (?, ?, ?, ?)',
      [userId, folderId, title.trim(), hasNote ? note : null]
    );

    const objectId = result.insertId;
    const uploadedMedia = [];

    // Upload files to Google Drive (or fallback)
    for (const file of files) {
      const uploadResult = await uploadMediaFile({
        fileBuffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        user: req.user
      });

      const mediaType = file.detectedMediaType || (
        file.mimetype.startsWith('image/') ? 'photo' :
        file.mimetype.startsWith('audio/') ? 'audio' : 'video'
      );

      const [mediaInsert] = await pool.query(`
        INSERT INTO media_files 
          (object_id, user_id, drive_file_id, original_name, mime_type, file_size_bytes, media_type, thumbnail_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        objectId,
        userId,
        uploadResult.driveFileId,
        file.originalname,
        file.mimetype,
        uploadResult.size || file.size,
        mediaType,
        uploadResult.thumbnailLink || null
      ]);

      uploadedMedia.push({
        id: mediaInsert.insertId,
        objectId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: uploadResult.size || file.size,
        mediaType,
        thumbnailUrl: uploadResult.thumbnailLink
      });
    }

    const [createdObjectRows] = await pool.query('SELECT * FROM objects WHERE id = ?', [objectId]);
    const createdObject = createdObjectRows[0];
    createdObject.media = uploadedMedia;

    res.status(201).json({ object: createdObject });
  } catch (error) {
    next(error);
  }
}

/**
 * Update object title or note
 */
async function updateObject(req, res, next) {
  try {
    const userId = req.user.id;
    const objectId = req.params.id;
    const { title, note } = req.body;

    const [rows] = await pool.query(
      'SELECT id, note FROM objects WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [objectId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Object not found.' });
    }

    const updates = [];
    const values = [];

    if (title !== undefined && title.trim()) {
      updates.push('title = ?');
      values.push(title.trim());
    }

    if (note !== undefined) {
      updates.push('note = ?');
      values.push(note.trim() ? note : null);
    }

    if (updates.length > 0) {
      values.push(objectId, userId);
      await pool.query(
        `UPDATE objects SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        values
      );
    }

    const [updatedRows] = await pool.query('SELECT * FROM objects WHERE id = ?', [objectId]);
    res.json({ object: updatedRows[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * Move object to a different folder
 */
async function moveObject(req, res, next) {
  try {
    const userId = req.user.id;
    const objectId = req.params.id;
    const { targetFolderId } = req.body;

    if (!targetFolderId) {
      return res.status(400).json({ error: 'Target folder ID is required.' });
    }

    // Verify folder exists & belongs to user
    const [folderRows] = await pool.query(
      'SELECT id FROM folders WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [targetFolderId, userId]
    );

    if (folderRows.length === 0) {
      return res.status(404).json({ error: 'Target folder not found.' });
    }

    await pool.query(
      'UPDATE objects SET folder_id = ? WHERE id = ? AND user_id = ?',
      [targetFolderId, objectId, userId]
    );

    res.json({ message: 'Object moved successfully.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Soft delete an object
 */
async function deleteObject(req, res, next) {
  try {
    const userId = req.user.id;
    const objectId = req.params.id;

    const [rows] = await pool.query(
      'SELECT id FROM objects WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [objectId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Object not found.' });
    }

    await pool.query(
      'UPDATE objects SET deleted_at = NOW() WHERE id = ? AND user_id = ?',
      [objectId, userId]
    );

    res.json({ message: 'Object moved to trash successfully.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload additional media files to an existing object
 */
async function uploadMediaToObject(req, res, next) {
  try {
    const userId = req.user.id;
    const objectId = req.params.id;
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({ error: 'No media files provided for upload.' });
    }

    const [objectRows] = await pool.query(
      'SELECT id FROM objects WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [objectId, userId]
    );

    if (objectRows.length === 0) {
      return res.status(404).json({ error: 'Object not found.' });
    }

    const uploadedMedia = [];

    for (const file of files) {
      const uploadResult = await uploadMediaFile({
        fileBuffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        user: req.user
      });

      const mediaType = file.detectedMediaType || (
        file.mimetype.startsWith('image/') ? 'photo' :
        file.mimetype.startsWith('audio/') ? 'audio' : 'video'
      );

      const [insertResult] = await pool.query(`
        INSERT INTO media_files 
          (object_id, user_id, drive_file_id, original_name, mime_type, file_size_bytes, media_type, thumbnail_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        objectId,
        userId,
        uploadResult.driveFileId,
        file.originalname,
        file.mimetype,
        uploadResult.size || file.size,
        mediaType,
        uploadResult.thumbnailLink || null
      ]);

      uploadedMedia.push({
        id: insertResult.insertId,
        objectId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: uploadResult.size || file.size,
        mediaType,
        thumbnailUrl: uploadResult.thumbnailLink
      });
    }

    res.status(201).json({ media: uploadedMedia });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a single media file from an object (also deletes from storage)
 */
async function deleteMedia(req, res, next) {
  try {
    const userId = req.user.id;
    const { id: objectId, mediaId } = req.params;

    const [rows] = await pool.query(
      'SELECT id, drive_file_id FROM media_files WHERE id = ? AND object_id = ? AND user_id = ? AND deleted_at IS NULL',
      [mediaId, objectId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Media file not found.' });
    }

    const media = rows[0];

    // Soft delete record and remove from storage
    await pool.query('UPDATE media_files SET deleted_at = NOW() WHERE id = ?', [mediaId]);
    await deleteMediaFile(media.drive_file_id, userId);

    res.json({ message: 'Media file deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getObject,
  createObject,
  updateObject,
  moveObject,
  deleteObject,
  uploadMediaToObject,
  deleteMedia
};
