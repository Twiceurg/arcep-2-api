"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "Clients",
      [
        {
          denomination: "Client A",
          adresse_siege: "Adresse du siège A",
          nom_representant_legal: "Nom A",
          fonction_representant_legal: "Fonction A",
          adresse_representant_legal: "Adresse du représentant A",
          telephone_morale: "0123456789",
          email_morale: "clientA@example.com",
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          denomination: "Client B",
          adresse_siege: "Adresse du siège B",
          nom_representant_legal: "Nom B",
          fonction_representant_legal: "Fonction B",
          adresse_representant_legal: "Adresse du représentant B",
          telephone_morale: "0987654321",
          email_morale: "clientB@example.com",
          created_at: new Date(),
          updated_at: new Date()
        }
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
};
