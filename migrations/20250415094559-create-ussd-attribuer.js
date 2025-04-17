"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("UssdAttribuers", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      ussd_attribution_id: {
        // Correction du nom de la colonne
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "USSDAttributions", // Référence à la table USSDAttributions
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      ussd_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "USSDs", // Référence à la table USSDs
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      ussd_attribue: {
        // Nom correct pour l'attribut "ussd_attribue"
        type: Sequelize.STRING,
        allowNull: false
      },
      statut: {
        type: Sequelize.ENUM(
          "libre",
          "attribue",
          "suspendu",
          "retiré",
          "résiliation",
          "reservation"
        ),
        defaultValue: "libre",
        allowNull: false
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
    await queryInterface.dropTable("UssdAttribuers");
  }
};
