const bcrypt = require("bcrypt");
const { Utilisateur } = require("../../models");
const hashPassword = require("../../utils/hashPassword");

const getAllUsers = async (req, res) => {
  try {
    // Récupérer tous les utilisateurs
    const users = await Utilisateur.findAll();

    return res.status(200).json({
      success: true,
      message: "Liste des utilisateurs récupérée avec succès.",
      data: users
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la récupération des utilisateurs."
    });
  }
};

// Création d'un utilisateur
const createUser = async (req, res) => {
  const { nom, prenom, role, username, email } = req.body;

  try {
    // Vérifier si l'email ou le nom d'utilisateur existe déjà
    const existingUser = await Utilisateur.findOne({
      where: {
        [Sequelize.Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Nom d'utilisateur ou email déjà utilisé."
      });
    }

    // Mot de passe par défaut
    const defaultPassword = "Togo@21!";

    // Hashage du mot de passe par défaut
    const hashedPassword = await hashPassword(defaultPassword);

    // Création de l'utilisateur
    const newUser = await Utilisateur.create({
      nom,
      prenom,
      role,
      username,
      password: hashedPassword,
      email,
      etat_compte: true,
      premiere_connexion: true
    });

    return res.status(201).json({
      success: true,
      message: "Utilisateur créé avec succès.",
      data: newUser
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la création de l'utilisateur."
    });
  }
};

// Suppression d'un utilisateur
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await Utilisateur.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé."
      });
    }

    await user.destroy();

    return res.status(200).json({
      success: true,
      message: "Utilisateur supprimé avec succès."
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la suppression de l'utilisateur."
    });
  }
};

// Modification d'un utilisateur
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, role, username, password, email, etat_compte } =
    req.body;

  try {
    const user = await Utilisateur.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé."
      });
    }

    // Vérifier si l'email ou le nom d'utilisateur est déjà pris (sauf pour l'utilisateur actuel)
    const existingUser = await Utilisateur.findOne({
      where: {
        [Sequelize.Op.or]: [{ email }, { username }],
        id: { [Sequelize.Op.ne]: id } // S'assurer que l'ID n'est pas celui de l'utilisateur actuel
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Nom d'utilisateur ou email déjà utilisé."
      });
    }

    // Si un mot de passe est fourni, hashage du nouveau mot de passe
    let updatedData = {
      nom,
      prenom,
      role,
      username,
      email,
      etat_compte: etat_compte || true
    };

    if (password) {
      updatedData.password = await bcrypt.hash(password, 10);
    }

    await user.update(updatedData);

    return res.status(200).json({
      success: true,
      message: "Utilisateur mis à jour avec succès.",
      data: user
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la mise à jour de l'utilisateur."
    });
  }
};

const toggleUserStatus = async (req, res) => {
  const { userId } = req.params; // L'ID de l'utilisateur à modifier
  const { status } = req.body; // Le statut à définir (true pour activer, false pour désactiver)

  // Vérification si le statut est bien un boolean
  if (status === undefined || typeof status !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "Le statut doit être un boolean (true ou false)."
    });
  }

  try {
    // Trouver l'utilisateur par son ID
    const utilisateur = await Utilisateur.findByPk(userId);

    if (!utilisateur) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé."
      });
    }

    // Mettre à jour le statut de l'utilisateur
    utilisateur.etat_compte = status;

    // Sauvegarder les modifications
    await utilisateur.save();

    return res.status(200).json({
      success: true,
      message: `Utilisateur ${status ? "activé" : "désactivé"} avec succès.`,
      data: utilisateur
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message:
        "Erreur serveur lors de la mise à jour du statut de l'utilisateur."
    });
  }
};

const changerMotDePasse = async (req, res) => {
  const { utilisateurId } = req.params;
  const { ancienMotDePasse, nouveauMotDePasse } = req.body;

  try {
    // Récupérer l'utilisateur
    const utilisateur = await Utilisateur.findByPk(utilisateurId);

    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Vérification de l'ancien mot de passe
    const motDePasseValide = await bcrypt.compare(
      ancienMotDePasse,
      utilisateur.password
    );

    if (!motDePasseValide) {
      return res
        .status(400)
        .json({ message: "Ancien mot de passe incorrect." });
    }

    // Hasher le nouveau mot de passe
    const motDePasseHash = await hashPassword(nouveauMotDePasse);

    // Mise à jour du mot de passe et de l'indicateur de changement
    utilisateur.password = motDePasseHash;
    utilisateur.premiere_connexion = false; // Marquer que le mot de passe a été changé

    // Sauvegarder les changements
    await utilisateur.save();

    return res
      .status(200)
      .json({ message: "Mot de passe modifié avec succès." });
  } catch (error) {
    console.error("Erreur lors du changement de mot de passe :", error);
    return res
      .status(500)
      .json({
        message: "Erreur serveur lors de la modification du mot de passe."
      });
  }
};

const resetPassword = async (req, res) => {
  const { utilisateurId } = req.params; // Récupérer l'ID de l'utilisateur à réinitialiser

  try {
    // Récupérer l'utilisateur
    const utilisateur = await Utilisateur.findByPk(utilisateurId);

    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Définir le mot de passe par défaut
    const motDePasseParDefaut = "Togo@21!";
    const motDePasseHash = await hashPassword(motDePasseParDefaut);

    // Mise à jour du mot de passe et marquer première connexion à true
    utilisateur.password = motDePasseHash;
    utilisateur.premiere_connexion = true; // Pour forcer l'utilisateur à le changer à la prochaine connexion

    // Sauvegarder les changements
    await utilisateur.save();

    return res
      .status(200)
      .json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (error) {
    console.error(
      "Erreur lors de la réinitialisation du mot de passe :",
      error
    );
    return res
      .status(500)
      .json({
        message: "Erreur serveur lors de la réinitialisation du mot de passe."
      });
  }
};

const getUserDetails = async (req, res) => {
  try {
    // Récupérer l'ID de l'utilisateur depuis req.user (défini par le middleware)
    const utilisateurId = req.user.id;

    // Récupérer l'utilisateur à partir de la base de données
    const utilisateur = await Utilisateur.findByPk(utilisateurId);

    if (!utilisateur) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Détails de l'utilisateur récupérés avec succès.",
      data: utilisateur
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la récupération des détails de l'utilisateur."
    });
  }
};

module.exports = {
  getAllUsers,
  updateUser,
  deleteUser,
  createUser,
  toggleUserStatus,
  changerMotDePasse,
  resetPassword,
  getUserDetails
};
