"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Rapports", {
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
          model: "AttributionNumeros", // Assurez-vous que c'est bien le bon nom de table
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      ref: {
        type: Sequelize.STRING,
        allowNull: false
      },
      creation_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      revision: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "00" // Valeur par défaut si non spécifié
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
        defaultValue: 1 // Valeur par défaut pour éviter un champ vide
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
    await queryInterface.dropTable("Rapports");
  }
};
