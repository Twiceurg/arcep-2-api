"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Utilisateur extends Model {
    static associate(models) {
      Utilisateur.hasMany(models.HistoriqueConnexion, {
        foreignKey: "utilisateur_id"
      });
      Utilisateur.hasMany(models.HistoriqueAttribution, {
        foreignKey: "utilisateur_id"
      });
      Utilisateur.hasMany(models.Notification, {
        foreignKey: "user_id"
      });
      Utilisateur.hasMany(models.HistoriqueAttributionNumero, {
        foreignKey: "utilisateur_id"
      });
    }
  }
  Utilisateur.init(
    {
      nom: {
        type: DataTypes.STRING,
        allowNull: false
      },
      prenom: {
        type: DataTypes.STRING,
        allowNull: false
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      etat_compte: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true // true = actif, false = inactif
      },
      premiere_connexion: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true // true = actif, false = inactif
      }
    },
    {
      sequelize,
      modelName: "Utilisateur",
      tableName: "Utilisateurs", // Assure que le nom de la table est en pluriel
      underscored: true, // Pour utiliser snake_case dans les colonnes
      timestamps: true, // Active la gestion de created_at et updated_at
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );
  return Utilisateur;
};
