"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Changer le type de la colonne utiliter en TEXT
    await queryInterface.changeColumn("AttributionNumeros", "utiliter", {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Revenir en arrière : remettre la colonne en STRING
    await queryInterface.changeColumn("AttributionNumeros", "utiliter", {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};
