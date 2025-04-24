"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class UssdDecision extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      UssdDecision.belongsTo(models.USSDAttribution, {
        foreignKey: "ussd_attribution_id"
      });
    }
  }
  UssdDecision.init(
    {
      ussd_attribution_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      duree_utilisation: {
        type: DataTypes.STRING,
        allowNull: true
      },
      reference_decision: {
        type: DataTypes.STRING,
        allowNull: true
      },
      date_attribution: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      type_decision: {
        type: DataTypes.ENUM(
          "modification",
          "reclamation",
          "suspension",
          "attribution",
          "retrait",
          "reservation",
          "renouvellement",
          "résiliation"
        ),
        allowNull: false
      },
      notification_envoyee: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      date_expiration: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      etat_autorisation: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      fichier: {
        type: DataTypes.STRING,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: "UssdDecision",
      tableName: "UssdDecisions",
      underscored: true
    }
  );
  return UssdDecision;
};
