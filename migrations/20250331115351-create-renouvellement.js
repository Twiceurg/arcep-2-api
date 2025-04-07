"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Renouvellements", {
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
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      decision_renouvellement: {
        type: Sequelize.STRING,
        allowNull: false,   
      },
      date_renouvellement: {
        type: Sequelize.DATEONLY,
        allowNull: false, 
      },
      date_expiration_renouvellement: {
        type: Sequelize.DATEONLY,
        allowNull: false,  
      },
      decision_id: {   
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "AttributionDecisions", 
          key: "id",  
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",   
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')  
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW') 
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Renouvellements");
  }
};
