"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Utilisation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Utilisation.belongsTo(models.Category, {
        foreignKey: "category_id"
      });

      // Utilisation appartient à un service
      Utilisation.belongsTo(models.Service, {
        foreignKey: "service_id"
      });

      Utilisation.hasMany(models.Pnn, {
        foreignKey: "utilisation_id",
        as: "pnns"
      });
      Utilisation.hasMany(models.USSD, {
        foreignKey: "utilisation_id",
      });

      Utilisation.hasMany(models.AttributionNumero, {
        foreignKey: "utilisation_id"
      });
      Utilisation.hasMany(models.NumeroAttribue, {
        foreignKey: "utilisation_id"
      });
      Utilisation.hasMany(models.USSDAttribution, {
        foreignKey: "utilisation_id"
      });
      Utilisation.hasMany(models.UssdAttribuer, {
        foreignKey: "utilisation_id"
      });
    }
  }

  Utilisation.init(
    {
      nom: {
        type: DataTypes.STRING,
        allowNull: true
      },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      service_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
      }
    },
    {
      sequelize,
      modelName: "Utilisation",
      tableName: "Utilisations",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );

  return Utilisation;
};
