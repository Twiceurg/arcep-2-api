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

/**
 * Authentifie un utilisateur LDAP et récupère ses informations
 */
const authenticateAndFetchLDAPUser = async (username, password) => {
  return new Promise((resolve, reject) => {
    const userPrincipalName = `${username}@interne.arcep.tg`;
    console.log("Tentative de connexion LDAP avec :");
    console.log("URL:", config.url);
    console.log("Username:", config.username);
    console.log("BaseDN:", config.baseDN);

    ad.authenticate(userPrincipalName, password, (err, auth) => {
      if (err) {
        console.error("Erreur lors de l'authentification LDAP:", err.message);
        return reject({
          success: false,
          message: "Échec de l'authentification : connexion à l'annuaire impossible. Veuillez vous assurer que vous êtes connecté au bon réseau"
        });
      }

      if (!auth) {
        return reject({ success: false, message: "Identifiants invalides" });
      }

      // Recherche les infos de l'utilisateur après authentification
      ad.findUser(userPrincipalName, (err, user) => {
        if (err || !user) {
          console.error(
            "Erreur lors de la récupération de l'utilisateur LDAP:",
            err?.message
          );
          return reject({
            success: false,
            message: "Utilisateur non trouvé"
          });
        }

        resolve({
          success: true,
          user: {
            username,
            nom: user.sn || "",
            prenom: user.givenName || "",
            email: user.mail || ""
          }
        });
      });
    });
  });
};

module.exports = { authenticateAndFetchLDAPUser };
