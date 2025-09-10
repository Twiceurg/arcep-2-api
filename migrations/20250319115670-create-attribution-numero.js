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
      zone_utilisation_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ZoneUtilisations",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
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
      regle: {
        type: Sequelize.STRING,
        allowNull: true
      },
      reference_decision: {
        type: Sequelize.STRING,
        allowNull: true
      },
      date_attribution: {
        type: Sequelize.DATE,
        allowNull: false
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
