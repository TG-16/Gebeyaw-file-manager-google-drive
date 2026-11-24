const { pool } = require('../config/db');
const { getMediaStream } = require('../services/drive.service');
const { verifyAccessToken, verifyRefreshToken } = require('../utils/jwt');

// Helper to authenticate user via either Bearer token, query token, cookie, OR shareToken query
async function checkMediaAccess(req, mediaId, requireDownloadPermission = false) {
  let userId = null;

  // 1. Check Bearer Authorization Header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = verifyAccessToken(authHeader.split(' ')[1]);
      userId = decoded.userId;
    } catch (e) {
      // Ignored, proceed to other auth checks
    }
  }

  // 2. Check query token (sent by frontend img / video / audio elements)
  if (!userId && req.query.token) {
    try {
      const decoded = verifyAccessToken(req.query.token);
      userId = decoded.userId;
    } catch (e) {
      // Ignored
    }
  }

  // 3. Check HTTP-only cookie refreshToken as direct browser media fallback
  if (!userId && req.cookies?.refreshToken) {
    try {
      const decoded = verifyRefreshToken(req.cookies.refreshToken);
      userId = decoded.userId;
    } catch (e) {
      // Ignored
    }
  }

  // 2. Query Media File info
  const [rows] = await pool.query(
    'SELECT id, object_id, drive_file_id, original_name, mime_type, file_size_bytes, user_id FROM media_files WHERE id = ? AND deleted_at IS NULL',
    [mediaId]
  );

  if (rows.length === 0) {
    return { error: 'Media file not found.', status: 404 };
  }

  const media = rows[0];

  // If user owns the file, grant full access
  if (userId && media.user_id === userId) {
    return { media };
  }

  // 3. Check share token if provided
  const shareToken = req.query.shareToken;
  if (shareToken) {
    // Check object share
    const [objShare] = await pool.query(
      'SELECT allow_download FROM object_shares WHERE token = ? AND object_id = ?',
      [shareToken, media.object_id]
    );

    if (objShare.length > 0) {
      if (requireDownloadPermission && !objShare[0].allow_download) {
        return { error: 'Downloading is disabled for this shared object.', status: 403 };
      }
      return { media };
    }

    // Check folder share
    const [folderShare] = await pool.query(`
      SELECT fs.allow_download 
      FROM folder_shares fs
      JOIN objects o ON o.folder_id = fs.folder_id
      WHERE fs.token = ? AND o.id = ? AND o.deleted_at IS NULL
    `, [shareToken, media.object_id]);

    if (folderShare.length > 0) {
      if (requireDownloadPermission && !folderShare[0].allow_download) {
        return { error: 'Downloading is disabled for this shared folder.', status: 403 };
      }
      return { media };
    }
  }

  return { error: 'Unauthorized to access this media file.', status: 401 };
}

/**
 * Stream/Proxy media file for viewing or playback
 */
async function streamMedia(req, res, next) {
  try {
    const mediaId = req.params.id;
    const { error, status, media } = await checkMediaAccess(req, mediaId, false);

    if (error) {
      return res.status(status).json({ error });
    }

    const { stream, size } = await getMediaStream(media.drive_file_id, media.user_id);

    res.setHeader('Content-Type', media.mime_type);
    if (size) {
      res.setHeader('Content-Length', size);
    }
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(media.original_name)}"`);

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

/**
 * Download a media file
 */
async function downloadMedia(req, res, next) {
  try {
    const mediaId = req.params.id;
    const { error, status, media } = await checkMediaAccess(req, mediaId, true);

    if (error) {
      return res.status(status).json({ error });
    }

    const { stream, size } = await getMediaStream(media.drive_file_id, media.user_id);

    res.setHeader('Content-Type', media.mime_type);
    if (size) {
      res.setHeader('Content-Length', size);
    }
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(media.original_name)}"`);

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

/**
 * Get thumbnail url for media file
 */
async function getThumbnail(req, res, next) {
  try {
    const mediaId = req.params.id;
    const { error, status, media } = await checkMediaAccess(req, mediaId, false);

    if (error) {
      return res.status(status).json({ error });
    }

    const [rows] = await pool.query(
      'SELECT thumbnail_url FROM media_files WHERE id = ?',
      [mediaId]
    );

    res.json({ thumbnail: rows[0]?.thumbnail_url || null });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  streamMedia,
  downloadMedia,
  getThumbnail
};
