"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Clients", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      denomination: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      adresse_siege: {
        type: Sequelize.STRING,
        allowNull: true
      },
      nom_representant_legal: {
        type: Sequelize.STRING,
        allowNull: true
      },
      fonction_representant_legal: {
        type: Sequelize.STRING,
        allowNull: true
      },
      adresse_representant_legal: {
        type: Sequelize.STRING,
        allowNull: true
      },
      activite: {
        type: Sequelize.STRING,
        allowNull: true
      },
      telephone_morale: {
        type: Sequelize.STRING,
        allowNull: true
      },
      email_morale: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Clients");
  }
};
