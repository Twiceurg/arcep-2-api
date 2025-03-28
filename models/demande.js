"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Demande extends Model {
    /**
     * Définition des associations
     */
    static associate(models) {
      // Une demande appartient à un client
      Demande.belongsTo(models.Client, {
        foreignKey: "client_id"
      });
    }
  }

  Demande.init(
    {
      client_id: {
        type: DataTypes.INTEGER,
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
        type: DataTypes.STRING,
        allowNull: false
      },
      motif_demande: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      numero_refere: {
        type: DataTypes.STRING,
        allowNull: true
      },
      numero_alternatif: {
        type: DataTypes.STRING,
        allowNull: true
      },
      type_preference: {
        type: DataTypes.STRING,
        allowNull: true
      },
      type_service: {
        type: DataTypes.STRING,
        allowNull: true
      },
      type_attribution: {
        type: DataTypes.STRING,
        allowNull: true
      },
      type_utilisation: {
        type: DataTypes.STRING,
        allowNull: true
      },

      // -------- DESCRIPTION DU SERVICE --------
      description_service: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      tarification: {
        type: DataTypes.STRING,
        allowNull: true
      },
      utilisation_cible: {
        type: DataTypes.STRING,
        allowNull: true
      },
      duree_utilisation: {
        type: DataTypes.STRING,
        allowNull: true
      },
      reseau_ressources: {
        type: DataTypes.STRING,
        allowNull: true
      },
      reseau_service_accessible: {
        type: DataTypes.STRING,
        allowNull: true
      },
      quantite_ressource: {
        type: DataTypes.INTEGER,
        allowNull: true
      },

      // -------- SERVICE EXPLOITATION --------
      service_exploitation: {
        type: DataTypes.STRING,
        allowNull: true
      },
      nom_gestionaire_numerotaion: {
        type: DataTypes.STRING,
        allowNull: true
      },
      telephone_service_exploitation: {
        type: DataTypes.STRING,
        allowNull: true
      },

      // -------- IDENTITE PERSONNE PHYSIQUE --------
      nom_prenoms: {
        type: DataTypes.STRING,
        allowNull: true
      },
      profession: {
        type: DataTypes.STRING,
        allowNull: true
      },
      adresse_physique: {
        type: DataTypes.STRING,
        allowNull: true
      },
      telephone_physique: {
        type: DataTypes.STRING,
        allowNull: true
      },
      email_physique: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      },
      pieces_identite: {
        type: DataTypes.STRING,
        allowNull: true
      },

      // -------- DESCRIPTION DES ACTIVITES --------
      description_activites: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      // -------- INFORMATIONS LICENCES/AUTORISATIONS --------
      licences: {
        type: DataTypes.JSON,
        allowNull: true // Un tableau JSON contenant plusieurs licences
      },

      etat: {
        type: DataTypes.ENUM(  "rejete", "traite", "accepte"), // Utilisation de DataTypes
        allowNull: true,
        defaultValue: "accepte" // Valeur par défaut en "en attente"
      },

      // -------- TIMESTAMPS --------
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
      }
    },
    {
      sequelize,
      modelName: "Demande",
      tableName: "Demandes",
      timestamps: true,
      underscored: true
    }
  );

  return Demande;
};
