const { pool } = require('../config/db');

/**
 * Global search across folders, objects, notes, and media file names
 */
async function searchAll(req, res, next) {
  try {
    const userId = req.user.id;
    const query = req.query.q ? req.query.q.trim() : '';

    if (!query) {
      return res.json({ results: [] });
    }

    const wildcard = `%${query}%`;

    // 1. Search folders by name
    const [matchingFolders] = await pool.query(`
      SELECT id, name, created_at, 'folder' AS type, NULL AS snippet, id AS target_folder_id
      FROM folders
      WHERE user_id = ? AND name LIKE ? AND deleted_at IS NULL
      LIMIT 20
    `, [userId, wildcard]);

    // 2. Search objects by title or note content
    const [matchingObjects] = await pool.query(`
      SELECT o.id, o.title AS name, o.created_at, 'object' AS type,
             SUBSTRING(o.note, 1, 150) AS snippet,
             o.folder_id AS target_folder_id,
             f.name AS folder_name
      FROM objects o
      JOIN folders f ON f.id = o.folder_id
      WHERE o.user_id = ? AND (o.title LIKE ? OR o.note LIKE ?) AND o.deleted_at IS NULL
      LIMIT 30
    `, [userId, wildcard, wildcard]);

    // 3. Search media files by original_name
    const [matchingMedia] = await pool.query(`
      SELECT m.id, m.original_name AS name, m.created_at, 'media' AS type,
             m.media_type AS snippet,
             o.folder_id AS target_folder_id,
             o.id AS target_object_id,
             o.title AS object_title,
             f.name AS folder_name
      FROM media_files m
      JOIN objects o ON o.id = m.object_id
      JOIN folders f ON f.id = o.folder_id
      WHERE m.user_id = ? AND m.original_name LIKE ? AND m.deleted_at IS NULL
      LIMIT 30
    `, [userId, wildcard]);

    const results = [
      ...matchingFolders,
      ...matchingObjects,
      ...matchingMedia
    ];

    res.json({ results });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  searchAll
};
