'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const typeUtilisationsData = [
      { libele_type: 'Appel', created_at: new Date(), updated_at: new Date() },
      { libele_type: 'USSD', created_at: new Date(), updated_at: new Date() },
      { libele_type: 'SMS', created_at: new Date(), updated_at: new Date() },
      { libele_type: 'USSD & SMS', created_at: new Date(), updated_at: new Date() },
      { libele_type: 'USSD & Appel', created_at: new Date(), updated_at: new Date() },
      { libele_type: 'Appel & SMS', created_at: new Date(), updated_at: new Date() },
      { libele_type: 'USSD & SMS & Appel', created_at: new Date(), updated_at: new Date() }
    ];

    await queryInterface.bulkInsert('TypeUtilisations', typeUtilisationsData, {});
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
