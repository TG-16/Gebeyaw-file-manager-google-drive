const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'file_manager',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Auto-initialize tables if database exists or connectable
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log(' Connected to MySQL database:', process.env.DB_NAME || 'file_manager');

    // Run table definitions
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name            VARCHAR(100) NOT NULL,
        email           VARCHAR(255) NOT NULL UNIQUE,
        password_hash   VARCHAR(255) NOT NULL,
        role            ENUM('admin', 'user') NOT NULL DEFAULT 'user',
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        drive_folder_id VARCHAR(255) DEFAULT NULL,
        last_login_at   DATETIME DEFAULT NULL,
        created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at      DATETIME DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id    INT UNSIGNED NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id    INT UNSIGNED NOT NULL,
        parent_id  INT UNSIGNED DEFAULT NULL,
        name       VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL,
        FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS objects (
        id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id    INT UNSIGNED NOT NULL,
        folder_id  INT UNSIGNED NOT NULL,
        title      VARCHAR(255) NOT NULL,
        note       MEDIUMTEXT DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL,
        FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS media_files (
        id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        object_id       INT UNSIGNED NOT NULL,
        user_id         INT UNSIGNED NOT NULL,
        drive_file_id   VARCHAR(255) NOT NULL,
        original_name   VARCHAR(255) NOT NULL,
        mime_type       VARCHAR(100) NOT NULL,
        file_size_bytes BIGINT UNSIGNED DEFAULT 0,
        media_type      ENUM('photo', 'audio', 'video') NOT NULL,
        thumbnail_url   TEXT DEFAULT NULL,
        created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at      DATETIME DEFAULT NULL,
        FOREIGN KEY (object_id) REFERENCES objects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS folder_shares (
        id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        folder_id       INT UNSIGNED NOT NULL UNIQUE,
        user_id         INT UNSIGNED NOT NULL,
        token           CHAR(36) NOT NULL UNIQUE,
        allow_download  BOOLEAN NOT NULL DEFAULT FALSE,
        created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS object_shares (
        id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        object_id       INT UNSIGNED NOT NULL UNIQUE,
        user_id         INT UNSIGNED NOT NULL,
        token           CHAR(36) NOT NULL UNIQUE,
        allow_download  BOOLEAN NOT NULL DEFAULT FALSE,
        created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (object_id) REFERENCES objects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure default admin user exists
    const [adminRows] = await connection.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (adminRows.length === 0) {
      const bcrypt = require('bcryptjs');
      const defaultAdminPass = 'Admin1234!';
      const salt = await bcrypt.genSalt(11);
      const hash = await bcrypt.hash(defaultAdminPass, salt);
      await connection.query(
        "INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'admin', 1)",
        ['Admin', 'admin@filemanager.local', hash]
      );
      console.log(' Default admin user created: admin@filemanager.local / Admin1234!');
    }

    connection.release();
  } catch (error) {
    console.error(' MySQL Initialization warning/error:', error.message);
    console.log('  Make sure MySQL is running and the database specified in .env exists.');
  }
}

module.exports = {
  pool,
  initDatabase
};
