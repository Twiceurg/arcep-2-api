'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const services = [
      {
        nom: "Service à valeur ajoutée long", 
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: "Service à valeur ajoutée court", 
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: "Services mobiles", 
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: "Services d’urgence", 
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: "Service d intérêt général",
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: "Service d urgence sécurité nationale ", 
        created_at: new Date(),
        updated_at: new Date()
      },

      {
        nom: "Service de Sélection",
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nom: 'Service de téléphonie fixe',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        nom: 'Service de téléphonie fixe',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    // Insérer les services dans la base de données
    await queryInterface.bulkInsert("Services", services, {});
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
};
