"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Demandes", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
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

      // -------- INFORMATIONS GENERALES --------
      type_demande: {
        type: Sequelize.STRING,
        allowNull: false
      },
      motif_demande: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      numero_refere: {
        type: Sequelize.STRING,
        allowNull: true
      },
      numero_alternatif: {
        type: Sequelize.STRING,
        allowNull: true
      },
      type_preference: {
        type: Sequelize.STRING,
        allowNull: true
      },
      type_utilisation: {
        type: Sequelize.STRING,
        allowNull: true
      },
      type_service: {
        type: Sequelize.STRING,
        allowNull: true
      },
      type_attribution: {
        type: Sequelize.STRING,
        allowNull: true
      },

      // -------- DESCRIPTION DU SERVICE --------
      description_service: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tarification: {
        type: Sequelize.STRING,
        allowNull: true
      },
      utilisation_cible: {
        type: Sequelize.STRING,
        allowNull: true
      },
      duree_utilisation: {
        type: Sequelize.STRING,
        allowNull: true
      },
      reseau_ressources: {
        type: Sequelize.STRING,
        allowNull: true
      },
      reseau_service_accessible: {
        type: Sequelize.STRING,
        allowNull: true
      },
      quantite_ressource: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      // -------- SERVICE EXPLOITATION --------
      service_exploitation: {
        type: Sequelize.STRING,
        allowNull: true
      },
      nom_gestionaire_numerotaion: {
        type: Sequelize.STRING,
        allowNull: true
      },
      telephone_service_exploitation: {
        type: Sequelize.STRING,
        allowNull: true
      },

      // -------- IDENTITE PERSONNE PHYSIQUE --------
      nom_prenoms: {
        type: Sequelize.STRING,
        allowNull: true
      },
      profession: {
        type: Sequelize.STRING,
        allowNull: true
      },
      adresse_physique: {
        type: Sequelize.STRING,
        allowNull: true
      },
      telephone_physique: {
        type: Sequelize.STRING,
        allowNull: true
      },
      email_physique: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      pieces_identite: {
        type: Sequelize.STRING,
        allowNull: true
      },

      // -------- DESCRIPTION DES ACTIVITES --------
      description_activites: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      // -------- INFORMATIONS LICENCES/AUTORISATIONS --------
      licences: {
        type: Sequelize.JSON,
        allowNull: true // Un tableau JSON contenant plusieurs licences
      },

      etat: {
        type: Sequelize.ENUM("accepte", "rejete", "traite"),
        allowNull: true,
        defaultValue: "accepte"
      },

      // -------- TIMESTAMPS --------
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
    await queryInterface.dropTable("Demandes");
  }
};
