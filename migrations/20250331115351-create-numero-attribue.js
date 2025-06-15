"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("NumeroAttribues", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      attribution_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "AttributionNumeros",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      numero_attribue: {
        type: Sequelize.STRING,
        allowNull: false
      },
      date_attribution: {
        type: Sequelize.DATEONLY,
        allowNull: true
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

      decision_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "AttributionDecisions", // Remplace par le nom exact de ta table de décisions
          key: "id"
        },
        onDelete: "CASCADE",
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
    await queryInterface.dropTable("NumeroAttribues");
  }
};
