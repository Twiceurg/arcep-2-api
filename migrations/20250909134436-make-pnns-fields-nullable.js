"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Rendre partition_length nullable
    await queryInterface.changeColumn("Pnns", "partition_length", {
      type: Sequelize.INTEGER,
      allowNull: true, // Devient nullable
    });

    // Rendre bloc_min nullable
    await queryInterface.changeColumn("Pnns", "bloc_min", {
      type: Sequelize.INTEGER,
      allowNull: true, // Devient nullable
    });

    // Rendre block_max nullable
    await queryInterface.changeColumn("Pnns", "block_max", {
      type: Sequelize.INTEGER,
      allowNull: true, // Devient nullable
    });
  },

  async down(queryInterface, Sequelize) {
    // Revenir à NOT NULL si on rollback
    await queryInterface.changeColumn("Pnns", "partition_length", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.changeColumn("Pnns", "bloc_min", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.changeColumn("Pnns", "block_max", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
