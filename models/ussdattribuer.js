"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class UssdAttribuer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      UssdAttribuer.belongsTo(models.USSDAttribution, {
        foreignKey: "ussd_attribution_id"
      });

      UssdAttribuer.belongsTo(models.USSD, {
        foreignKey: "ussd_id"
      });
    }
  }
  UssdAttribuer.init(
    {
      ussd_attribution_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "USSDAttributions",
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      ussd_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "USSDs",
          key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      },
      ussd_attribue: {
        type: DataTypes.STRING,
        allowNull: false
      },
      statut: {
        type: DataTypes.ENUM(
          "libre",
          "attribue",
          "suspendu",
          "retiré",
          "résiliation",
          "reservation"
        ),
        defaultValue: "libre",
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "UssdAttribuer",
      tableName: "UssdAttribuers",
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );
  return UssdAttribuer;
};
