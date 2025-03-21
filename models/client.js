"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Client extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Client.hasMany(models.AttributionNumero, { 
        foreignKey: "client_id",  
      });
    }
  }
  Client.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      denomination: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      },
      adresse_siege: {
        type: DataTypes.STRING,
        allowNull: true
      },
      nom_representant_legal: {
        type: DataTypes.STRING,
        allowNull: true
      },
      fonction_representant_legal: {
        type: DataTypes.STRING,
        allowNull: true
      },
      adresse_representant_legal: {
        type: DataTypes.STRING,
        allowNull: true
      },
      telephone_morale: {
        type: DataTypes.STRING,
        allowNull: true
      },
      email_morale: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      }
    },
    {
      sequelize,
      modelName: "Client",
      tableName: "Clients",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );
  return Client;
};
