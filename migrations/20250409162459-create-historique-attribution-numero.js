'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('HistoriqueAttributionNumeros', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      attribution_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'AttributionNumeros',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      numero_id: {  
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'NumeroAttribues',  
          key: 'id',
        },
        onDelete: 'CASCADE', 
      },
      numero: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      date_attribution: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      motif: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      utilisateur_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Utilisateurs', 
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('HistoriqueAttributionNumeros');
  }
};