"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ZoneUtilisation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ZoneUtilisation.belongsTo(models.Utilisation, {
        foreignKey: "utilisation_id"
      });
      ZoneUtilisation.hasMany(models.AttributionNumero, {
        foreignKey: "zone_utilisation_id"
      });
      ZoneUtilisation.hasMany(models.NumeroAttribue, {
        foreignKey: "zone_utilisation_id"
      });
      ZoneUtilisation.hasMany(models.Pnn, {
        foreignKey: "zone_utilisation_id"
      });
    }
  }
  ZoneUtilisation.init(
    {
      nom: {
        type: DataTypes.STRING,
        allowNull: false
      },
      utilisation_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "ZoneUtilisation",
      tableName: "ZoneUtilisations",
      underscored: true
    }
  );
  return ZoneUtilisation;
};
