const { pool } = require('../config/db');
const { deleteMediaFile } = require('./drive.service');

/**
 * Clean up items that have been in the trash for more than 30 days.
 * Permanently removes media files from Drive and rows from DB.
 */
async function cleanupOldTrash() {
  try {
    console.log(' [Trash Cleanup] Checking for expired trash items (> 30 days)...');

    // 1. Find media files deleted > 30 days ago
    const [expiredMedia] = await pool.query(`
      SELECT id, drive_file_id, user_id 
      FROM media_files 
      WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL 30 DAY
    `);

    for (const media of expiredMedia) {
      try {
        await deleteMediaFile(media.drive_file_id, media.user_id);
      } catch (err) {
        console.error(`Failed to delete expired media ${media.drive_file_id} from storage:`, err);
      }
    }

    if (expiredMedia.length > 0) {
      const mediaIds = expiredMedia.map(m => m.id);
      await pool.query('DELETE FROM media_files WHERE id IN (?)', [mediaIds]);
      console.log(` Permanently purged ${expiredMedia.length} expired media files.`);
    }

    // 2. Permanently delete objects deleted > 30 days ago
    const [resultObjects] = await pool.query(`
      DELETE FROM objects 
      WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL 30 DAY
    `);
    if (resultObjects.affectedRows > 0) {
      console.log(` Permanently purged ${resultObjects.affectedRows} expired objects.`);
    }

    // 3. Permanently delete folders deleted > 30 days ago
    const [resultFolders] = await pool.query(`
      DELETE FROM folders 
      WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL 30 DAY
    `);
    if (resultFolders.affectedRows > 0) {
      console.log(` Permanently purged ${resultFolders.affectedRows} expired folders.`);
    }
  } catch (error) {
    console.error(' Error running trash cleanup job:', error);
  }
}

function startTrashCleanupCron() {
  // Run once immediately on start
  cleanupOldTrash();
  // Run every 24 hours (86400000 ms)
  setInterval(cleanupOldTrash, 24 * 60 * 60 * 1000);
}

module.exports = {
  cleanupOldTrash,
  startTrashCleanupCron
};
