const { pool } = require('../config/db');
const { hashPassword } = require('../utils/hash');

/**
 * List all users (admin only)
 */
async function listUsers(req, res, next) {
  try {
    const [users] = await pool.query(`
      SELECT id, name, email, role, is_active, drive_folder_id, last_login_at, created_at
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `);

    res.json({ users });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new user account (admin only)
 * Password hashed with salt rounds: 11
 */
async function createUser(req, res, next) {
  try {
    const { name, email, password, role = 'user' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const passwordHash = await hashPassword(password);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
      [name.trim(), cleanEmail, passwordHash, role === 'admin' ? 'admin' : 'user']
    );

    const [newUser] = await pool.query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ user: newUser[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user profile (name, email)
 */
async function updateUser(req, res, next) {
  try {
    const userId = req.params.id;
    const { name, email } = req.body;

    const updates = [];
    const values = [];

    if (name && name.trim()) {
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [cleanEmail, userId]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Email already in use by another account.' });
      }
      updates.push('email = ?');
      values.push(cleanEmail);
    }

    if (updates.length > 0) {
      values.push(userId);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const [updatedRows] = await pool.query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({ user: updatedRows[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * Reset user password (admin only)
 */
async function resetPassword(req, res, next) {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    const passwordHash = await hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);

    // Invalidate any existing refresh tokens
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);

    res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Toggle user active status (deactivate / reactivate)
 */
async function toggleUserStatus(req, res, next) {
  try {
    const userId = req.params.id;
    const { isActive } = req.body;

    // Prevent deactivating own admin account
    if (parseInt(userId, 10) === req.user.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, userId]);

    if (!isActive) {
      // Invalidate refresh tokens if deactivated
      await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
    }

    res.json({ message: `User account ${isActive ? 'activated' : 'deactivated'} successfully.` });
  } catch (error) {
    next(error);
  }
}

/**
 * Soft delete user account
 */
async function deleteUser(req, res, next) {
  try {
    const userId = req.params.id;

    if (parseInt(userId, 10) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    await pool.query('UPDATE users SET deleted_at = NOW() WHERE id = ?', [userId]);
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);

    res.json({ message: 'User account deleted.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  toggleUserStatus,
  deleteUser
};
