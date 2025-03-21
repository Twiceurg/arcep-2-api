const bcrypt = require('bcryptjs');

/**
 * Fonction pour hacher un mot de passe en utilisant bcrypt.
 * @param {string} password - Le mot de passe en clair à hacher.
 * @returns {Promise<string>} - Le mot de passe haché.
 */
const hashPassword = async (password) => {
  const saltRounds = 15;  
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
};

module.exports = hashPassword;
