"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("RapportUssds", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      ussd_attribution_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "USSDAttributions",
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      ref: {
        type: Sequelize.STRING,
        allowNull: true
      },
      creation_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      revision: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "00"
      },
      ticket: {
        type: Sequelize.STRING,
        allowNull: false
      },
      demandeur: {
        type: Sequelize.STRING,
        allowNull: false
      },
      type_numeros: {
        type: Sequelize.STRING,
        allowNull: false
      },
      type_utilisation: {
        type: Sequelize.STRING,
        allowNull: false
      },
      quantite: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      type_service: {
        type: Sequelize.STRING,
        allowNull: false
      },
      condition_tarifaire: {
        type: Sequelize.STRING,
        allowNull: true
      },
      utilisation_envisagee: {
        type: Sequelize.STRING,
        allowNull: true
      },
      preference_demandeur: {
        type: Sequelize.STRING,
        allowNull: true
      },
      analyse_demande: {
        type: Sequelize.STRING,
        allowNull: true
      },
      conclusion: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        )
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("RapportUssds");
  }
};
