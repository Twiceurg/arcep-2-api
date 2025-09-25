"use strict";
const { Sequelize, DataTypes } = require("sequelize"); // Add this line to import Sequelize
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class TypeUtilisation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      TypeUtilisation.belongsToMany(models.AttributionNumero, {
        through: "TypeUtilisationAttributionNumeros",
        foreignKey: "type_utilisation_id",
        otherKey: "attribution_numero_id"
      });

      TypeUtilisation.hasMany(models.USSDAttribution, {
        foreignKey: "type_utilisation_id"
      });

      TypeUtilisation.belongsToMany(models.NumeroAttribue, {
        through: "TypeUtilisationNumeroAttribues",
        foreignKey: "type_utilisation_id",
        otherKey: "numero_attribue_id"
      });
    }
  }

  TypeUtilisation.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      libele_type: {
        type: DataTypes.STRING,
        allowNull: true // Ajouté si vous voulez qu'il puisse être NULL
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") // Valeur par défaut à la date actuelle
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    },
    {
      sequelize,
      modelName: "TypeUtilisation",
      tableName: "TypeUtilisations",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );

  return TypeUtilisation;
};
