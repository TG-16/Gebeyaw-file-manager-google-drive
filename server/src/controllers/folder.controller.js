const { pool } = require('../config/db');

/**
 * Get top-level (root) folders for the logged-in user
 */
async function getRootFolders(req, res, next) {
  try {
    const userId = req.user.id;
    const [folders] = await pool.query(`
      SELECT f.id, f.name, f.created_at, f.updated_at,
        (SELECT COUNT(*) FROM objects o WHERE o.folder_id = f.id AND o.deleted_at IS NULL) AS object_count,
        (SELECT COUNT(*) FROM folders sf WHERE sf.parent_id = f.id AND sf.deleted_at IS NULL) AS subfolder_count,
        fs.token AS share_token,
        fs.allow_download AS share_allow_download
      FROM folders f
      LEFT JOIN folder_shares fs ON fs.folder_id = f.id
      WHERE f.user_id = ? AND f.parent_id IS NULL AND f.deleted_at IS NULL
      ORDER BY f.created_at DESC
    `, [userId]);

    res.json({ folders });
  } catch (error) {
    next(error);
  }
}

/**
 * Get contents of a specific folder (subfolders + objects with preview info)
 */
async function getFolderContents(req, res, next) {
  try {
    const userId = req.user.id;
    const folderId = req.params.id;

    // Check folder exists and belongs to user
    const [folderRows] = await pool.query(`
      SELECT f.id, f.parent_id, f.name, f.created_at, f.updated_at,
             fs.token AS share_token, fs.allow_download AS share_allow_download
      FROM folders f
      LEFT JOIN folder_shares fs ON fs.folder_id = f.id
      WHERE f.id = ? AND f.user_id = ? AND f.deleted_at IS NULL
    `, [folderId, userId]);

    if (folderRows.length === 0) {
      return res.status(404).json({ error: 'Folder not found.' });
    }

    const currentFolder = folderRows[0];

    // Get subfolders
    const [subfolders] = await pool.query(`
      SELECT f.id, f.name, f.created_at, f.updated_at,
        (SELECT COUNT(*) FROM objects o WHERE o.folder_id = f.id AND o.deleted_at IS NULL) AS object_count,
        (SELECT COUNT(*) FROM folders sf WHERE sf.parent_id = f.id AND sf.deleted_at IS NULL) AS subfolder_count,
        fs.token AS share_token,
        fs.allow_download AS share_allow_download
      FROM folders f
      LEFT JOIN folder_shares fs ON fs.folder_id = f.id
      WHERE f.parent_id = ? AND f.user_id = ? AND f.deleted_at IS NULL
      ORDER BY f.created_at DESC
    `, [folderId, userId]);

    // Get objects with media preview summary
    const [objects] = await pool.query(`
      SELECT o.id, o.folder_id, o.title, o.note, o.created_at, o.updated_at,
             os.token AS share_token, os.allow_download AS share_allow_download,
             (SELECT COUNT(*) FROM media_files m WHERE m.object_id = o.id AND m.deleted_at IS NULL) AS media_count
      FROM objects o
      LEFT JOIN object_shares os ON os.object_id = o.id
      WHERE o.folder_id = ? AND o.user_id = ? AND o.deleted_at IS NULL
      ORDER BY o.created_at DESC
    `, [folderId, userId]);

    // Fetch primary preview media for each object
    for (const obj of objects) {
      const [mediaRows] = await pool.query(`
        SELECT id, media_type, drive_file_id, thumbnail_url, original_name, mime_type
        FROM media_files
        WHERE object_id = ? AND deleted_at IS NULL
        ORDER BY FIELD(media_type, 'photo', 'video', 'audio'), id ASC
      `, [obj.id]);

      obj.media = mediaRows;
      obj.primaryMedia = mediaRows.length > 0 ? mediaRows[0] : null;
      obj.hasNote = !!(obj.note && obj.note.trim().length > 0);
    }

    res.json({
      folder: currentFolder,
      subfolders,
      objects
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get breadcrumb ancestry path
 */
async function getBreadcrumb(req, res, next) {
  try {
    const userId = req.user.id;
    const folderId = req.params.id;

    const path = [];
    let currentId = folderId;

    while (currentId) {
      const [rows] = await pool.query(
        'SELECT id, parent_id, name FROM folders WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
        [currentId, userId]
      );
      if (rows.length === 0) break;
      path.unshift(rows[0]);
      currentId = rows[0].parent_id;
    }

    res.json({ breadcrumb: path });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new folder
 */
async function createFolder(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, parentId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required.' });
    }

    let validParentId = null;
    if (parentId) {
      const [pRows] = await pool.query(
        'SELECT id FROM folders WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
        [parentId, userId]
      );
      if (pRows.length === 0) {
        return res.status(400).json({ error: 'Parent folder does not exist.' });
      }
      validParentId = parentId;
    }

    const [result] = await pool.query(
      'INSERT INTO folders (user_id, parent_id, name) VALUES (?, ?, ?)',
      [userId, validParentId, name.trim()]
    );

    const [createdRows] = await pool.query('SELECT * FROM folders WHERE id = ?', [result.insertId]);
    res.status(201).json({ folder: createdRows[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * Update / rename or move folder
 */
async function updateFolder(req, res, next) {
  try {
    const userId = req.user.id;
    const folderId = req.params.id;
    const { name, parentId } = req.body;

    const [rows] = await pool.query(
      'SELECT id, parent_id, name FROM folders WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [folderId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found.' });
    }

    // Prevent moving folder inside itself
    if (parentId && parseInt(parentId, 10) === parseInt(folderId, 10)) {
      return res.status(400).json({ error: 'Cannot move folder inside itself.' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined && name.trim()) {
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (parentId !== undefined) {
      updates.push('parent_id = ?');
      values.push(parentId ? parseInt(parentId, 10) : null);
    }

    if (updates.length > 0) {
      values.push(folderId, userId);
      await pool.query(
        `UPDATE folders SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        values
      );
    }

    const [updatedRows] = await pool.query('SELECT * FROM folders WHERE id = ?', [folderId]);
    res.json({ folder: updatedRows[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * Helper to soft delete recursive subfolders & objects
 */
async function softDeleteDescendants(folderId, userId) {
  // Find child folders
  const [children] = await pool.query(
    'SELECT id FROM folders WHERE parent_id = ? AND user_id = ? AND deleted_at IS NULL',
    [folderId, userId]
  );

  for (const child of children) {
    await softDeleteDescendants(child.id, userId);
  }

  // Soft delete child folders
  await pool.query(
    'UPDATE folders SET deleted_at = NOW() WHERE parent_id = ? AND user_id = ? AND deleted_at IS NULL',
    [folderId, userId]
  );

  // Soft delete child objects
  await pool.query(
    'UPDATE objects SET deleted_at = NOW() WHERE folder_id = ? AND user_id = ? AND deleted_at IS NULL',
    [folderId, userId]
  );
}

/**
 * Soft-delete a folder
 */
async function deleteFolder(req, res, next) {
  try {
    const userId = req.user.id;
    const folderId = req.params.id;

    const [rows] = await pool.query(
      'SELECT id FROM folders WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [folderId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found.' });
    }

    // Soft delete the folder itself
    await pool.query(
      'UPDATE folders SET deleted_at = NOW() WHERE id = ? AND user_id = ?',
      [folderId, userId]
    );

    // Soft delete its children
    await softDeleteDescendants(folderId, userId);

    res.json({ message: 'Folder moved to trash successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRootFolders,
  getFolderContents,
  getBreadcrumb,
  createFolder,
  updateFolder,
  deleteFolder
};
