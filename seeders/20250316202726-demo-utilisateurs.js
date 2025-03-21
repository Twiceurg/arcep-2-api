"use strict";
const hashPassword = require("../utils/hashPassword"); // Importation de la fonction pour hacher les mots de passe

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Utilisation de la fonction hashPassword pour hacher le mot de passe
    const hashedPassword = await hashPassword("password123"); // Hash du mot de passe par défaut

    await queryInterface.bulkInsert("Utilisateurs", [
      {
        nom: "Doe",
        prenom: "John",
        role: "admin", // Le rôle de l'utilisateur (peut être "admin", "user", etc.)
        username: "john_doe",
        password: hashedPassword, // Assurez-vous que le mot de passe est haché
        email: "john.doe@example.com",
        etat_compte: true, // Actif
        premiere_connexion: true, // Doit changer son mot de passe
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: "Smith",
        prenom: "Jane",
        role: "user", // Le rôle de l'utilisateur
        username: "jane_smith",
        password: hashedPassword, // Utilisation du mot de passe haché
        email: "jane.smith@example.com",
        etat_compte: true, // Actif
        premiere_connexion: true, // Doit changer son mot de passe
        created_at: new Date(),
        updated_at: new Date()
      }
      // Ajoute d'autres utilisateurs si besoin
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Utilisateurs", null, {});
  }
};
