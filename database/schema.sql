-- Database schema for Personal File Manager

CREATE DATABASE IF NOT EXISTS file_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE file_manager;

-- 1. Users table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Folders table (supports nested hierarchy)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Objects table (holds note and metadata, groups media)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Media files table (stores Google Drive file references)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Folder shares table
CREATE TABLE IF NOT EXISTS folder_shares (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  folder_id       INT UNSIGNED NOT NULL UNIQUE,
  user_id         INT UNSIGNED NOT NULL,
  token           CHAR(36) NOT NULL UNIQUE,
  allow_download  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Object shares table
CREATE TABLE IF NOT EXISTS object_shares (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  object_id       INT UNSIGNED NOT NULL UNIQUE,
  user_id         INT UNSIGNED NOT NULL,
  token           CHAR(36) NOT NULL UNIQUE,
  allow_download  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (object_id) REFERENCES objects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_folders_user_parent ON folders(user_id, parent_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_objects_user_folder ON objects(user_id, folder_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_media_object ON media_files(object_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
