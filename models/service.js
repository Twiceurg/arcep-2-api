"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Service extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Service.hasMany(models.Pnn, {
        foreignKey: "service_id",
        as: "pnns"
      });
      Service.hasMany(models.AttributionNumero, { 
        foreignKey: "service_id", 
        as: "attributions"
      });
    }
  }
  Service.init(
    {
      nom: DataTypes.STRING
    },
    {
      sequelize,
      modelName: "Service",
      tableName: "Services",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );
  return Service;
};
