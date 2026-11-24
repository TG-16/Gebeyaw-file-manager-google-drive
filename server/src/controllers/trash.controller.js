const { pool } = require('../config/db');
const { deleteMediaFile } = require('../services/drive.service');

/**
 * List all trashed items (folders and objects) for the logged-in user
 * Includes days remaining out of 30 days.
 */
async function listTrash(req, res, next) {
  try {
    const userId = req.user.id;

    // Get trashed folders
    const [folders] = await pool.query(`
      SELECT id, name, created_at, deleted_at, 'folder' AS item_type,
             GREATEST(0, 30 - DATEDIFF(NOW(), deleted_at)) AS days_remaining
      FROM folders
      WHERE user_id = ? AND deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
    `, [userId]);

    // Get trashed objects
    const [objects] = await pool.query(`
      SELECT o.id, o.title AS name, o.created_at, o.deleted_at, 'object' AS item_type,
             GREATEST(0, 30 - DATEDIFF(NOW(), o.deleted_at)) AS days_remaining,
             f.name AS folder_name
      FROM objects o
      JOIN folders f ON f.id = o.folder_id
      WHERE o.user_id = ? AND o.deleted_at IS NOT NULL
      ORDER BY o.deleted_at DESC
    `, [userId]);

    res.json({
      trash: [...folders, ...objects].sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Restore a folder or object from trash
 */
async function restoreItem(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { type } = req.query; // 'folder' or 'object'

    if (type === 'folder') {
      await pool.query(
        'UPDATE folders SET deleted_at = NULL WHERE id = ? AND user_id = ?',
        [id, userId]
      );
      // Restore child objects and subfolders
      await pool.query(
        'UPDATE folders SET deleted_at = NULL WHERE parent_id = ? AND user_id = ?',
        [id, userId]
      );
      await pool.query(
        'UPDATE objects SET deleted_at = NULL WHERE folder_id = ? AND user_id = ?',
        [id, userId]
      );
      return res.json({ message: 'Folder restored successfully.' });
    }

    if (type === 'object') {
      // Check if parent folder is also deleted; if so, move object to root or warn
      const [objRows] = await pool.query(
        'SELECT folder_id FROM objects WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (objRows.length > 0) {
        const [folderRows] = await pool.query(
          'SELECT deleted_at FROM folders WHERE id = ?',
          [objRows[0].folder_id]
        );
        // If parent folder is deleted, restore it as well
        if (folderRows.length > 0 && folderRows[0].deleted_at !== null) {
          await pool.query('UPDATE folders SET deleted_at = NULL WHERE id = ?', [objRows[0].folder_id]);
        }
      }

      await pool.query(
        'UPDATE objects SET deleted_at = NULL WHERE id = ? AND user_id = ?',
        [id, userId]
      );
      return res.json({ message: 'Object restored successfully.' });
    }

    res.status(400).json({ error: 'Valid query parameter type ("folder" or "object") is required.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Permanently delete a specific item from trash
 */
async function permanentlyDeleteItem(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { type } = req.query; // 'folder' or 'object'

    if (type === 'object') {
      // Find all media files to delete from Drive
      const [mediaFiles] = await pool.query(
        'SELECT drive_file_id FROM media_files WHERE object_id = ? AND user_id = ?',
        [id, userId]
      );

      for (const media of mediaFiles) {
        await deleteMediaFile(media.drive_file_id, userId);
      }

      await pool.query('DELETE FROM objects WHERE id = ? AND user_id = ?', [id, userId]);
      return res.json({ message: 'Object permanently deleted.' });
    }

    if (type === 'folder') {
      // Find all objects inside folder
      const [objects] = await pool.query(
        'SELECT id FROM objects WHERE folder_id = ? AND user_id = ?',
        [id, userId]
      );

      for (const obj of objects) {
        const [mediaFiles] = await pool.query(
          'SELECT drive_file_id FROM media_files WHERE object_id = ? AND user_id = ?',
          [obj.id, userId]
        );
        for (const media of mediaFiles) {
          await deleteMediaFile(media.drive_file_id, userId);
        }
      }

      await pool.query('DELETE FROM folders WHERE id = ? AND user_id = ?', [id, userId]);
      return res.json({ message: 'Folder and contents permanently deleted.' });
    }

    res.status(400).json({ error: 'Valid query parameter type ("folder" or "object") is required.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Empty trash: permanently delete everything currently trashed for user
 */
async function emptyTrash(req, res, next) {
  try {
    const userId = req.user.id;

    // Get all media in trashed objects
    const [trashedMedia] = await pool.query(`
      SELECT m.drive_file_id 
      FROM media_files m
      JOIN objects o ON o.id = m.object_id
      WHERE o.user_id = ? AND o.deleted_at IS NOT NULL
    `, [userId]);

    for (const media of trashedMedia) {
      await deleteMediaFile(media.drive_file_id, userId);
    }

    // Delete trashed objects
    await pool.query('DELETE FROM objects WHERE user_id = ? AND deleted_at IS NOT NULL', [userId]);

    // Delete trashed folders
    await pool.query('DELETE FROM folders WHERE user_id = ? AND deleted_at IS NOT NULL', [userId]);

    res.json({ message: 'Trash emptied permanently.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTrash,
  restoreItem,
  permanentlyDeleteItem,
  emptyTrash
};
