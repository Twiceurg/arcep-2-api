const jwt = require("jsonwebtoken");

// Middleware d'authentification basé sur JWT
function authenticateToken(req, res, next) {
  const token = req.header("Authorization") && req.header("Authorization").replace("Bearer ", "");
  
  if (!token) {
    return res.status(401).json({ message: "Token manquant." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token invalide." });
    }
    
    // Ajouter les informations de l'utilisateur dans la requête
    req.user = decoded;  // L'objet utilisateur sera ici
    next();  // Passer au contrôleur suivant
  });
}

module.exports = authenticateToken;
