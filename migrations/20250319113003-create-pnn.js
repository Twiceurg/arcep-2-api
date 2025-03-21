"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Pnns", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      partition_prefix: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      partition_length: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      bloc_min: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      block_max: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      // length_number: {
      //   type: Sequelize.INTEGER,
      //   allowNull: false
      // },
      service_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Services",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Pnns");
  }
};
