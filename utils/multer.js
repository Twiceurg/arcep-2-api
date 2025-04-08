const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Vérifier et créer le dossier 'uploads' s'il n'existe pas
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // Crée le dossier et ses sous-dossiers si nécessaire
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);  // Spécifie le dossier de destination
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Ajouter un préfixe pour éviter les collisions de noms
  }
});

// Limiter les types de fichiers et la taille
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite à 5MB
  fileFilter: (req, file, cb) => {
    // Accepter uniquement les fichiers PDF et Word (DOCX)
    if (file.mimetype === 'application/pdf' || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF et Word (DOCX) sont autorisés'), false);
    }
  }
});

module.exports = upload; // Vous pouvez exporter cette configuration pour l'utiliser dans vos routes
