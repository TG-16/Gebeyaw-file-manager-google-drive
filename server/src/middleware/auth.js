const { verifyAccessToken } = require('../utils/jwt');
const { pool } = require('../config/db');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. No Bearer token provided.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return res.status(401).json({ error: 'Token expired or invalid', code: 'TOKEN_EXPIRED' });
    }

    const [rows] = await pool.query(
      'SELECT id, name, email, role, is_active, drive_folder_id FROM users WHERE id = ? AND deleted_at IS NULL',
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found or account deactivated.' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account has been deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireAuth
};
