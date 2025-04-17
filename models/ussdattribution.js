"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class USSDAttribution extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      USSDAttribution.belongsTo(models.USSD, {
        foreignKey: "ussd_id"
      });
      USSDAttribution.belongsTo(models.Client, {
        foreignKey: "client_id"
      });

      USSDAttribution.hasMany(models.UssdAttribuer, {
        foreignKey: "ussd_attribution_id"
      });

      USSDAttribution.hasMany(models.UssdDecision, {
        foreignKey: "ussd_attribution_id"
      });
      USSDAttribution.hasMany(models.UssdAttributionHistorique, {
        foreignKey: "ussd_attribution_id",  
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      });
    }
  }
  USSDAttribution.init(
    {
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
      status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.fn("NOW")
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.fn("NOW")
      }
    },
    {
      sequelize,
      modelName: "USSDAttribution",
      tableName: "USSDAttributions",
      underscored: true,
      timestamps: true
    }
  );
  return USSDAttribution;
};
