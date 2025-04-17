"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("UssdAttributionHistoriques", {
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
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      utilisateur_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Utilisateurs",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      reference_modification: {
        type: Sequelize.STRING,
        allowNull: true
      },
      motif: {
        type: Sequelize.STRING,
        allowNull: false
      },
      type_modification: {
        type: Sequelize.ENUM(
          "modification",
          "reclamation",
          "suspension",
          "attribution",
          "retrait",
          "reservation",
          "résiliation"
        ),
        allowNull: false
      },
      date_debut: {
        type: Sequelize.DATE,
        allowNull: true
      },
      duree_suspension: {
        type: Sequelize.STRING,
        allowNull: true
      },
      date_fin_suspension: {
        type: Sequelize.DATE,
        allowNull: true
      },
      appliquee: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW")
      },
      fichier: {
        type: Sequelize.STRING,
        allowNull: true
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW")
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("UssdAttributionHistoriques");
  }
};
