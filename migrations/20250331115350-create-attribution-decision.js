'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AttributionDecisions', {
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
        onUpdate: 'CASCADE',
      },
      duree_utilisation: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      reference_decision: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      date_attribution: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      type_decision: {
        type: Sequelize.ENUM("modification", "reclamation", "suspension","attribution","retrait","reservation","renouvellement"),
        allowNull: false,
      },
      date_expiration: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      etat_autorisation: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      fichier: {
        type: Sequelize.STRING,
        allowNull: true,
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
    await queryInterface.dropTable('AttributionDecisions');
  }
};