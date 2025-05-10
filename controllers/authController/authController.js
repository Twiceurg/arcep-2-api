const jwt = require("jsonwebtoken");
const { Utilisateur, HistoriqueConnexion } = require("../../models");
const { authenticateAndFetchLDAPUser } = require("../../services/ldapService");

const login = async (req, res) => {
  let { username, password } = req.body;
  username = username?.trim();
  password = password?.trim();

  if (!username || !password) {
    return res.json({
      success: false,
      message: "Veuillez fournir un nom d'utilisateur et un mot de passe."
    });
  }

  try {
    // Étape 1 : Authentification via Active Directory (LDAP)
    let ldapResponse;
    try {
      ldapResponse = await authenticateAndFetchLDAPUser(username, password);
    } catch (err) {
      console.error("Erreur LDAP:", err);
      return res.json({
        success: false,
        message: err.message || "Échec de l'authentification LDAP"
      });
    }

    if (!ldapResponse.success) {
      return res.json({
        success: false,
        message: ldapResponse.message || "Utilisateur LDAP non trouvé"
      });
    }

    // Étape 2 : Vérification en base de données
    const utilisateur = await Utilisateur.findOne({ where: { username } });

    if (!utilisateur) {
      return res.json({
        success: false,
        message:
          "Accès refusé. Utilisateur non autorisé dans cette application."
      });
    }

    if (!utilisateur.etat_compte) {
      return res.json({
        success: false,
        message: "Compte désactivé. Veuillez contacter l'administrateur."
      });
    }

    // Étape 3 : Génération du token JWT + Historique
    const token = jwt.sign(
      {
        id: utilisateur.id,
        username: utilisateur.username,
        role: utilisateur.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "5h" }
    );

    await HistoriqueConnexion.create({
      utilisateur_id: utilisateur.id,
      adresse_ip: req.ip,
      date_connexion: new Date()
    });

    const utilisateurSansPassword = { ...utilisateur.get() };
    delete utilisateurSansPassword.password;

    return res.json({
      success: true,
      message: "Connexion réussie.",
      user: utilisateurSansPassword,
      token
    });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return res.json({
      success: false,
      message: "Erreur serveur lors de la connexion."
    });
  }
};

module.exports = { login };
