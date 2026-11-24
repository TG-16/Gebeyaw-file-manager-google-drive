const bcrypt = require('bcryptjs');

// Password rules: minimum 8 characters, hashed with bcrypt (salt rounds: 11)
const BCRYPT_SALT_ROUNDS = 11;

async function hashPassword(plainTextPassword) {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(plainTextPassword, salt);
}

async function comparePassword(plainTextPassword, hashedPassword) {
  return bcrypt.compare(plainTextPassword, hashedPassword);
}

module.exports = {
  hashPassword,
  comparePassword,
  BCRYPT_SALT_ROUNDS
};
