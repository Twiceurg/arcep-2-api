const jwt = require("jsonwebtoken");
const { Utilisateur } = require("../models");

async function authenticateToken(req, res, next) {
  const token =
    req.header("Authorization") &&
    req.header("Authorization").replace("Bearer ", "");

  if (!token) {
    return res.json({ message: "Token manquant." });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.json({ message: "Token invalide." });
    }

    console.log("Token décodé:", decoded);

    try {
      // Recherche dans la base l'utilisateur par son ID (stocké dans le token)
      const utilisateur = await Utilisateur.findByPk(decoded.id);

      if (!utilisateur) {
        return res.json({ message: "Utilisateur non trouvé." });
      }

      req.user = utilisateur; // utilisateur à jour depuis la base
      console.log("Utilisateur authentifié:", req.user); // Afficher l'utilisateur attaché
      next();
    } catch (error) {
      console.error("Erreur dans authenticateToken:", error);
      res.json({ message: "Erreur serveur." });
    }
  });
}

module.exports = authenticateToken;
