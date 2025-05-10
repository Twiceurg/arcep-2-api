const jwt = require("jsonwebtoken");
const { Utilisateur } = require("../models");

const authorizeRole = (...allowedRoles) => {
  return async (req, res, next) => {
    const token =
      req.header("Authorization") &&
      req.header("Authorization").replace("Bearer ", "");

    if (!token) {
      return res.json({ success: false, message: "Token manquant." });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.json({ success: false, message: "Token invalide." });
      }

      try {
        const utilisateur = await Utilisateur.findByPk(decoded.id);

        if (!utilisateur) {
          return res.json({
            success: false,
            message: "Utilisateur non trouvé."
          });
        }

        req.user = utilisateur;

        console.log("✅ Utilisateur authentifié :", utilisateur.role);

        if (!allowedRoles.includes(utilisateur.role)) {
          return res.json({
            success: false,
            message: "Accès interdit. Rôle insuffisant."
          });
        }

        next();
      } catch (error) {
        console.error("Erreur dans authorize middleware:", error);
        return res.json({ success: false, message: "Erreur serveur." });
      }
    });
  };
};

module.exports = authorizeRole;
