"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class UssdRenouvellement extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      UssdRenouvellement.belongsTo(models.USSDAttribution, {
        foreignKey: "ussd_attribution_id"
      });

      UssdRenouvellement.belongsTo(models.UssdDecision, {
        foreignKey: "ussd_decision_id"
      });
    }
  }
  UssdRenouvellement.init(
    {
      ussd_attribution_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      ussd_decision_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      decision_renouvellement: {
        type: DataTypes.STRING,
        allowNull: false
      },
      date_renouvellement: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      date_expiration_renouvellement: {
        type: DataTypes.DATEONLY,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "UssdRenouvellement",
      tableName: "UssdRenouvellements",
      underscored: true,
      timestamps: true
    }
  );
  return UssdRenouvellement;
};
