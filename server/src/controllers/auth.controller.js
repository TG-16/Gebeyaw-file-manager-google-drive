const crypto = require('crypto');
const { pool } = require('../config/db');
const { comparePassword } = require('../utils/hash');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function login(req, res, next) {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const [rows] = await pool.query(
      'SELECT id, name, email, password_hash, role, is_active, drive_folder_id FROM users WHERE email = ? AND deleted_at IS NULL',
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account is deactivated. Please contact the administrator.' });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const tokenPayload = { userId: user.id, role: user.role };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload, !!rememberMe);

    // Store hashed refresh token in DB
    const tokenHash = hashToken(refreshToken);
    const expiresDays = rememberMe ? 30 : 7;
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, tokenHash, expiresAt]
    );

    // Update last login
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    // Set HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: expiresDays * 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided.' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({ error: 'Refresh token expired or invalid.' });
    }

    const tokenHash = hashToken(refreshToken);
    const [rows] = await pool.query(
      'SELECT id, user_id FROM refresh_tokens WHERE token_hash = ? AND expires_at > NOW()',
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }

    const [userRows] = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ? AND deleted_at IS NULL',
      [decoded.userId]
    );

    if (userRows.length === 0 || !userRows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive.' });
    }

    const user = userRows[0];
    const newAccessToken = signAccessToken({ userId: user.id, role: user.role });

    res.json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await pool.query('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
}

module.exports = {
  login,
  refresh,
  logout,
  me
};
