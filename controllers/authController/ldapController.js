const ActiveDirectory = require("activedirectory2");
const dotenv = require("dotenv");

dotenv.config();

const config = {
  url: `ldap://${process.env.LDAP_HOST}:${process.env.LDAP_PORT}`,
  baseDN: process.env.LDAP_BASE_DN,
  username: process.env.LDAP_USERNAME,
  password: process.env.LDAP_PASSWORD
};

const ad = new ActiveDirectory(config);

const getAllUsersLdap = async (req, res) => {
  ad.findUsers("(objectClass=user)", true, (err, users) => {
    if (err) {
      console.error("Erreur LDAP :", err.message);
      return res.json({
        success: false,
        message: "Erreur lors de la récupération des utilisateurs LDAP"
      });
    }

    if (!users || users.length === 0) {
      return res.json({
        success: false,
        message: "Aucun utilisateur LDAP trouvé"
      });
    }

    const cleanedUsers = users.map((user) => ({
      username: user.sAMAccountName || user.uid || "",
      nom: user.sn || "",
      prenom: user.givenName || "",
      email: user.mail || ""
    }));

    return res.json({
      success: true,
      users: cleanedUsers,
      message: "Utilisateurs LDAP récupérés avec succès"
    });
  });
};

const getLdapUserByUsername = async (username) => {
  return new Promise((resolve, reject) => {
    ad.findUser(username, (err, user) => {
      if (err) {
        console.error("Erreur LDAP:", err.message);
        return reject({
          success: false,
          message: "Erreur lors de la récupération de l'utilisateur LDAP"
        });
      }

      if (!user) {
        return reject({
          success: false,
          message: `Utilisateur ${username} non trouvé dans LDAP`
        });
      }

      // Nettoyer et formater les données de l'utilisateur
      const cleanedUser = {
        username: user.sAMAccountName || user.uid || "",
        nom: user.sn || "",
        prenom: user.givenName || "",
        email: user.mail || ""
      };

      return resolve(cleanedUser);
    });
  });
};

module.exports = { getAllUsersLdap, getLdapUserByUsername };
