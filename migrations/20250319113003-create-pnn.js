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
      partition_prefix_b: {
        type: Sequelize.INTEGER,
        allowNull: true
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
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Categories",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      etat: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
    // await queryInterface.sequelize.query(`
    //   CREATE UNIQUE INDEX unique_partition_combination ON \`Pnns\`
    //   (LEAST(partition_prefix, partition_prefix_b), GREATEST(partition_prefix, partition_prefix_b));
    // `);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Pnns");
  }
};
