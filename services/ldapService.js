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

    ad.authenticate(userPrincipalName, password, (err, auth) => {
      if (err) {
        console.error("Erreur LDAP:", err);

        // Cas typique de problème de réseau ou mauvais hôte LDAP
        if (
          err.message?.includes("ENOTFOUND") ||
          err.message?.includes("ECONNREFUSED") ||
          err.message?.includes("connect") ||
          err.message?.includes("Cannot contact")
        ) {
          return reject({
            success: false,
            message:
              "Connexion à l'annuaire impossible. Veuillez vérifier votre connexion réseau ou les paramètres LDAP."
          });
        }

        // Cas probable : identifiants invalides
        return reject({
          success: false,
          message: "Nom d'utilisateur ou mot de passe incorrect."
        });
      }

      if (!auth) {
        return reject({
          success: false,
          message: "Nom d'utilisateur ou mot de passe incorrect."
        });
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
            message: "Utilisateur trouvé mais aucune donnée récupérée."
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
