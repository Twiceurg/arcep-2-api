const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Utilisateur, HistoriqueConnexion } = require("../../models");

const login = async (req, res) => {
  let { username, password } = req.body;

  // Suppression des espaces inutiles
  username = username ? username.trim() : "";
  password = password ? password.trim() : "";

  // Vérification des champs obligatoires
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Veuillez fournir un username et un mot de passe."
    });
  }

  try {
    // Recherche de l'utilisateur par username
    const utilisateur = await Utilisateur.findOne({
      where: { username }
    });

    if (!utilisateur) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé."
      });
    }

    // Comparaison du mot de passe
    const isMatch = await bcrypt.compare(password, utilisateur.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Mot de passe incorrect."
      });
    }

    // Vérification de l'état du compte
    if (!utilisateur.etat_compte) {
      return res.status(403).json({
        success: false,
        message: "Compte désactivé. Veuillez contacter l'administrateur."
      });
    }

    // Création du token JWT
    const token = jwt.sign(
      {
        id: utilisateur.id,
        username: utilisateur.username,
        role: utilisateur.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "5h" }
    );

    // Création de l'historique de la connexion
    await HistoriqueConnexion.create({
      utilisateur_id: utilisateur.id,
      adresse_ip: req.ip,
      date_connexion: new Date()
    });

    // Suppression du mot de passe de l'objet utilisateur pour la réponse
    const utilisateurSansPassword = { ...utilisateur.get() };
    delete utilisateurSansPassword.password;

    // Réponse avec succès
    return res.status(200).json({
      success: true,
      message: "Connexion réussie.",
      user: utilisateurSansPassword,
      token
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la connexion."
    });
  }
};

module.exports = { login };
