"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const services = [
      {
        nom: "Service de Sélection",
        created_at: new Date(),
        updated_at: new Date()
      },

      {
        nom: "Services d’urgence et interet general",
        created_at: new Date(),
        updated_at: new Date()
      },

      {
        nom: "Service de téléphonie fixe",
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: "Service Spéciaux",
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: "Services de téléphonie  mobiles",
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert("Services", services, {});
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
