"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("DecisionNumeros", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      numero_attribue_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "NumeroAttribues", 
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      decision_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "AttributionDecisions",
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
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
    await queryInterface.dropTable("DecisionNumeros");
  }
};
