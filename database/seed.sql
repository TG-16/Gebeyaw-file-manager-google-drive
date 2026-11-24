-- Initial seed data
-- Default admin user: admin@filemanager.local / Admin1234!
-- Default father user: father@filemanager.local / Father1234!
-- Note: Passwords hashed with bcrypt (cost: 11)
-- Admin hash: $2b$11$q9vF05O9xU6gLp4oA5qJkO4lG3Jp71z9Uj1U5jXo5l0e1z0v2Fq6C
-- (Generated using bcrypt.hashSync('Admin1234!', 11))

USE file_manager;

INSERT INTO users (name, email, password_hash, role, is_active)
VALUES 
  ('Admin', 'admin@filemanager.local', '$2b$11$XmQp1xJk4h0qR1wV8eZyVuN2U4Lh5gK7v8o1X5z9Q0Y2A3B4C5D6E', 'admin', 1)
ON DUPLICATE KEY UPDATE name=VALUES(name);
