"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class USSD extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      USSD.hasMany(models.UssdAttribuer, {
        foreignKey: "ussd_id"
      });

      USSD.belongsTo(models.Utilisation, { foreignKey: "utilisation_id" });
    }
  }
  USSD.init(
    {
      prefix: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      length: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      bloc_min: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      utilisation_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Utilisations",
          key: "id"
        }
      },
      bloc_max: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      etat: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: "USSD",
      tableName: "USSDs",
      underscored: true
    }
  );

  return USSD;
};
