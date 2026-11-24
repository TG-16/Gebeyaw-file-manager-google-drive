const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');

/**
 * Generate or retrieve share link for a folder
 * Default allow_download: FALSE
 */
async function createFolderShare(req, res, next) {
  try {
    const userId = req.user.id;
    const folderId = req.params.id;
    const { allowDownload = false } = req.body;

    const [folderRows] = await pool.query(
      'SELECT id FROM folders WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [folderId, userId]
    );

    if (folderRows.length === 0) {
      return res.status(404).json({ error: 'Folder not found.' });
    }

    const token = uuidv4();

    await pool.query(`
      INSERT INTO folder_shares (folder_id, user_id, token, allow_download)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE token = VALUES(token), allow_download = VALUES(allow_download)
    `, [folderId, userId, token, allowDownload ? 1 : 0]);

    res.json({
      token,
      allowDownload: !!allowDownload,
      shareUrl: `/share/${token}`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Revoke folder share link
 */
async function revokeFolderShare(req, res, next) {
  try {
    const userId = req.user.id;
    const folderId = req.params.id;

    await pool.query('DELETE FROM folder_shares WHERE folder_id = ? AND user_id = ?', [folderId, userId]);
    res.json({ message: 'Folder share link revoked.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Toggle allow_download for a folder share link
 */
async function toggleFolderDownload(req, res, next) {
  try {
    const userId = req.user.id;
    const folderId = req.params.id;
    const { allowDownload } = req.body;

    await pool.query(
      'UPDATE folder_shares SET allow_download = ? WHERE folder_id = ? AND user_id = ?',
      [allowDownload ? 1 : 0, folderId, userId]
    );

    res.json({ allowDownload: !!allowDownload });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate or retrieve share link for an individual object
 * Default allow_download: FALSE
 */
async function createObjectShare(req, res, next) {
  try {
    const userId = req.user.id;
    const objectId = req.params.id;
    const { allowDownload = false } = req.body;

    const [objectRows] = await pool.query(
      'SELECT id FROM objects WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [objectId, userId]
    );

    if (objectRows.length === 0) {
      return res.status(404).json({ error: 'Object not found.' });
    }

    const token = uuidv4();

    await pool.query(`
      INSERT INTO object_shares (object_id, user_id, token, allow_download)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE token = VALUES(token), allow_download = VALUES(allow_download)
    `, [objectId, userId, token, allowDownload ? 1 : 0]);

    res.json({
      token,
      allowDownload: !!allowDownload,
      shareUrl: `/share/${token}`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Revoke object share link
 */
async function revokeObjectShare(req, res, next) {
  try {
    const userId = req.user.id;
    const objectId = req.params.id;

    await pool.query('DELETE FROM object_shares WHERE object_id = ? AND user_id = ?', [objectId, userId]);
    res.json({ message: 'Object share link revoked.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Toggle allow_download for an object share link
 */
async function toggleObjectDownload(req, res, next) {
  try {
    const userId = req.user.id;
    const objectId = req.params.id;
    const { allowDownload } = req.body;

    await pool.query(
      'UPDATE object_shares SET allow_download = ? WHERE object_id = ? AND user_id = ?',
      [allowDownload ? 1 : 0, objectId, userId]
    );

    res.json({ allowDownload: !!allowDownload });
  } catch (error) {
    next(error);
  }
}

/**
 * Public endpoint to view a shared folder or object by UUID token (no login required)
 */
async function getSharedItem(req, res, next) {
  try {
    const { token } = req.params;

    // Check if token belongs to folder share
    const [folderShare] = await pool.query(`
      SELECT fs.folder_id, fs.allow_download, f.name AS folder_name, f.created_at
      FROM folder_shares fs
      JOIN folders f ON f.id = fs.folder_id
      WHERE fs.token = ? AND f.deleted_at IS NULL
    `, [token]);

    if (folderShare.length > 0) {
      const share = folderShare[0];
      const folderId = share.folder_id;

      // Get objects in this shared folder
      const [objects] = await pool.query(`
        SELECT o.id, o.title, o.note, o.created_at
        FROM objects o
        WHERE o.folder_id = ? AND o.deleted_at IS NULL
        ORDER BY o.created_at DESC
      `, [folderId]);

      for (const obj of objects) {
        const [media] = await pool.query(`
          SELECT id, original_name, mime_type, file_size_bytes, media_type, thumbnail_url, created_at
          FROM media_files
          WHERE object_id = ? AND deleted_at IS NULL
          ORDER BY FIELD(media_type, 'photo', 'video', 'audio'), id ASC
        `, [obj.id]);
        obj.media = media;
        obj.primaryMedia = media.length > 0 ? media[0] : null;
      }

      return res.json({
        type: 'folder',
        folder: {
          id: folderId,
          name: share.folder_name,
          createdAt: share.created_at
        },
        allowDownload: !!share.allow_download,
        objects
      });
    }

    // Check if token belongs to object share
    const [objectShare] = await pool.query(`
      SELECT os.object_id, os.allow_download, o.title, o.note, o.created_at, f.name AS folder_name
      FROM object_shares os
      JOIN objects o ON o.id = os.object_id
      JOIN folders f ON f.id = o.folder_id
      WHERE os.token = ? AND o.deleted_at IS NULL
    `, [token]);

    if (objectShare.length > 0) {
      const share = objectShare[0];
      const objectId = share.object_id;

      const [media] = await pool.query(`
        SELECT id, original_name, mime_type, file_size_bytes, media_type, thumbnail_url, created_at
        FROM media_files
        WHERE object_id = ? AND deleted_at IS NULL
        ORDER BY created_at ASC
      `, [objectId]);

      return res.json({
        type: 'object',
        object: {
          id: objectId,
          title: share.title,
          note: share.note,
          folderName: share.folder_name,
          createdAt: share.created_at,
          media
        },
        allowDownload: !!share.allow_download
      });
    }

    res.status(404).json({ error: 'Shared link not found or has expired.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createFolderShare,
  revokeFolderShare,
  toggleFolderDownload,
  createObjectShare,
  revokeObjectShare,
  toggleObjectDownload,
  getSharedItem
};
