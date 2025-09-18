const bcrypt = require("bcrypt");
const { Utilisateur } = require("../../models");
const hashPassword = require("../../utils/hashPassword");
const { authenticateAndFetchLDAPUser } = require("../../services/ldapService");
const { getLdapUserByUsername } = require("./ldapController");

const getAllUsers = async (req, res) => {
  try {
    // Récupérer tous les utilisateurs
    const users = await Utilisateur.findAll();

    return res.json({
      success: true,
      message: "Liste des utilisateurs récupérée avec succès.",
      data: users
    });
  } catch (error) {
    console.error(error);
    return res.json({
      success: false,
      message: "Erreur serveur lors de la récupération des utilisateurs."
    });
  }
};

// Création d'un utilisateur
const ajouterUtilisateurLDAP = async (req, res) => {
  const { username, nom, prenom, email, role } = req.body;
  const password = "1234567890"; // Le mot de passe par défaut

  // Si nom, prénom, et rôle sont présents, vérifier uniquement ceux-là
  if (!username || !nom || !prenom || !role) {
    return res.json({
      success: false,
      message: "Tous les champs obligatoires sont requis."
    });
  }

  try {
    // Authentifie l'utilisateur via LDAP et récupère ses informations
    const ldapUser = await getLdapUserByUsername(username); // Remplace par ta logique LDAP pour obtenir l'utilisateur

    if (!ldapUser) {
      return res.json({
        success: false,
        message: "Utilisateur non trouvé dans LDAP."
      });
    }

    // Si l'email n'est pas fourni, on le génère à partir du nom d'utilisateur ou d'autres données
    const utilisateurEmail =
      email || ldapUser.email || `${username}@exemple.com`;

    // Vérifie si l'utilisateur existe déjà en base de données
    const utilisateurExist = await Utilisateur.findOne({ where: { username } });
    if (utilisateurExist) {
      return res.json({
        success: false,
        message: "Utilisateur déjà existant dans la base."
      });
    }

    // Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création de l'utilisateur dans la base de données
    const nouvelUtilisateur = await Utilisateur.create({
      username,
      nom: ldapUser.nom || nom, // Utilise les données LDAP ou celles fournies
      prenom: ldapUser.prenom || prenom,
      email: utilisateurEmail, // Utilise l'email généré ou celui de LDAP
      role,
      password: hashedPassword,
      etat_compte: true,
      premiere_connexion: true
    });

    return res.json({
      success: true,
      message: "Utilisateur LDAP ajouté avec succès.",
      user: {
        id: nouvelUtilisateur.id,
        username: nouvelUtilisateur.username,
        email: nouvelUtilisateur.email
      }
    });
  } catch (err) {
    console.error(err.message);
    return res.json({
      success: false,
      message: "Erreur serveur lors de l'ajout de l'utilisateur LDAP."
    });
  }
};

const changeUserRole = async (req, res) => {
  const { userId } = req.params; // ID de l'utilisateur à modifier
  const { role } = req.body; // Nouveau rôle à affecter

  // Vérifier que le rôle est fourni et non vide
  if (!role || typeof role !== "string" || role.trim() === "") {
    return res.json({
      success: false,
      message: "Le rôle doit être une chaîne de caractères non vide."
    });
  }

  try {
    // Trouver l'utilisateur par son ID
    const utilisateur = await Utilisateur.findByPk(userId);

    if (!utilisateur) {
      return res.json({
        success: false,
        message: "Utilisateur non trouvé."
      });
    }

    // Mettre à jour le rôle de l'utilisateur
    utilisateur.role = role.trim();

    // Sauvegarder les modifications
    await utilisateur.save();

    return res.json({
      success: true,
      message: `Rôle de l'utilisateur modifié en ${role}.`,
      data: utilisateur
    });
  } catch (error) {
    console.error("Erreur lors de la modification du rôle :", error);
    return res.json({
      success: false,
      message: "Erreur serveur lors de la mise à jour du rôle de l'utilisateur."
    });
  }
};

// Suppression d'un utilisateur
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await Utilisateur.findByPk(id);

    if (!user) {
      return res.json({
        success: false,
        message: "Utilisateur non trouvé."
      });
    }

    await user.destroy();

    return res.json({
      success: true,
      message: "Utilisateur supprimé avec succès."
    });
  } catch (error) {
    console.error(error);
    return res.json({
      success: false,
      message: "Erreur serveur lors de la suppression de l'utilisateur."
    });
  }
};

const toggleUserStatus = async (req, res) => {
  const { userId } = req.params; // L'ID de l'utilisateur à modifier
  const { status } = req.body; // Le statut à définir (true pour activer, false pour désactiver)

  // Vérification si le statut est bien un boolean
  if (status === undefined || typeof status !== "boolean") {
    return res.json({
      success: false,
      message: "Le statut doit être un boolean (true ou false)."
    });
  }

  try {
    // Trouver l'utilisateur par son ID
    const utilisateur = await Utilisateur.findByPk(userId);

    if (!utilisateur) {
      return res.json({
        success: false,
        message: "Utilisateur non trouvé."
      });
    }

    // Mettre à jour le statut de l'utilisateur
    utilisateur.etat_compte = status;

    // Sauvegarder les modifications
    await utilisateur.save();

    return res.json({
      success: true,
      message: `Utilisateur ${status ? "activé" : "désactivé"} avec succès.`,
      data: utilisateur
    });
  } catch (error) {
    console.error(error);
    return res.json({
      success: false,
      message:
        "Erreur serveur lors de la mise à jour du statut de l'utilisateur."
    });
  }
};

const resetPassword = async (req, res) => {
  const { utilisateurId } = req.params; // Récupérer l'ID de l'utilisateur à réinitialiser

  try {
    // Récupérer l'utilisateur
    const utilisateur = await Utilisateur.findByPk(utilisateurId);

    if (!utilisateur) {
      return res.json({ success: false, message: "Utilisateur non trouvé." });
    }

    // Définir le mot de passe par défaut
    const motDePasseParDefaut = "Togo@21!";
    const motDePasseHash = await hashPassword(motDePasseParDefaut);

    // Mise à jour du mot de passe et marquer première connexion à true
    utilisateur.password = motDePasseHash;
    utilisateur.premiere_connexion = true; // Pour forcer l'utilisateur à le changer à la prochaine connexion

    // Sauvegarder les changements
    await utilisateur.save();

    return res.json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (error) {
    console.error(
      "Erreur lors de la réinitialisation du mot de passe :",
      error
    );
    return res.json({
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
      return res.json({
        success: false,
        message: "Utilisateur non trouvé."
      });
    }

    return res.json({
      success: true,
      message: "Détails de l'utilisateur récupérés avec succès.",
      data: utilisateur
    });
  } catch (error) {
    console.error(error);
    return res.json({
      success: false,
      message:
        "Erreur serveur lors de la récupération des détails de l'utilisateur."
    });
  }
};

module.exports = {
  getAllUsers,
  deleteUser,
  ajouterUtilisateurLDAP,
  toggleUserStatus,
  resetPassword,
  getUserDetails,
  changeUserRole
};
