const express = require("express");
const authenticateToken = require("../middleware/authenticateToken");
const {
  getUserDetails,
  ajouterUtilisateurLDAP,
  deleteUser,
  getAllUsers,
  toggleUserStatus,
  resetPassword,
  changeUserRole
} = require("../controllers/authController/userController");
const { login } = require("../controllers/authController/authController");
const {
  getAllUsersLdap
} = require("../controllers/authController/ldapController");
const authorizeRole = require("../middleware/authorizeRole");
const { checkNumeroDisponibilite } = require("../controllers/actionController/verificationController");
const router = express.Router();

router.post("/login", login);

router.get("/user-details", authenticateToken, getUserDetails);

router.get("/users", authenticateToken, authorizeRole("superadmin"), getAllUsers);

router.get(
  "/users_ldap",
  authenticateToken,
  authorizeRole("superadmin"),
  getAllUsersLdap
);

router.post(
  "/add-ldap-user",
  authenticateToken,
  authorizeRole("superadmin"),
  ajouterUtilisateurLDAP
);

router.delete(
  "/user/:id",
  authenticateToken,
  authorizeRole("superadmin"),
  deleteUser
);

router.patch(
  "/user/:userId/status",
  authenticateToken,
  authorizeRole("superadmin"),
  toggleUserStatus
);
router.put(
  "/user/:userId/role",
  authenticateToken,
  authorizeRole("superadmin"),
  changeUserRole
);

router.post(
  "/user/:utilisateurId/reset-password",
  authenticateToken,
  resetPassword
);
router.post(
  "/numeroValidation", 
  checkNumeroDisponibilite
);

module.exports = router;
