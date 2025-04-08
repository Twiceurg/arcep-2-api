"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("AttributionNumeros", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      type_utilisation_id: {
        // Correction du nom de la colonne pour cohérence
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "TypeUtilisations", // Correction du nom du modèle cible
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      service_id: {
        // Correction du nom pour cohérence
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Services",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      pnn_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Pnns",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Clients",
          key: "id"
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE"
      },
      utilisation_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Utilisations",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      duree_utilisation: {
        type: Sequelize.STRING,
        allowNull: true
      },
      regle: {
        type: Sequelize.STRING,
        allowNull: true
      },
      reference_decision: {
        type: Sequelize.STRING,
        allowNull: true
      },
      date_attribution: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      date_expiration: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      etat_autorisation: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
    await queryInterface.dropTable("AttributionNumeros");
  }
};
