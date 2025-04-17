"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class UssdAttributionHistorique extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      UssdAttributionHistorique.belongsTo(models.USSDAttribution, {
        foreignKey: "ussd_attribution_id"
      });

      // Association avec Utilisateur
      UssdAttributionHistorique.belongsTo(models.Utilisateur, {
        foreignKey: "utilisateur_id"
      });
    }
  }
  UssdAttributionHistorique.init(
    {
      ussd_attribution_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      utilisateur_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      reference_modification: {
        type: DataTypes.STRING,
        allowNull: true
      },
      motif: {
        type: DataTypes.STRING,
        allowNull: false
      },
      type_modification: {
        type: DataTypes.ENUM(
          "modification",
          "reclamation",
          "suspension",
          "attribution",
          "retrait",
          "reservation",
          "résiliation"
        ),
        allowNull: false
      },
      date_debut: {
        type: DataTypes.DATE,
        allowNull: true
      },
      duree_suspension: {
        type: DataTypes.STRING,
        allowNull: true
      },
      date_fin_suspension: {
        type: DataTypes.DATE,
        allowNull: true
      },
      appliquee: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      fichier: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "UssdAttributionHistorique",
      tableName: "UssdAttributionHistoriques",
      underscored: true,
      timestamps: true
    }
  );
  return UssdAttributionHistorique;
};
