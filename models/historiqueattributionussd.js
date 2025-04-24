"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class HistoriqueAttributionUSSD extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      HistoriqueAttributionUSSD.belongsTo(models.USSDAttribution, {
        foreignKey: "ussd_attribution_id"
      });

      // Relation vers UssdAttribuer
      HistoriqueAttributionUSSD.belongsTo(models.UssdAttribuer, {
        foreignKey: "numero_id"
      });

      // Relation vers Utilisateur
      HistoriqueAttributionUSSD.belongsTo(models.Utilisateur, {
        foreignKey: "utilisateur_id"
      });
    }
  }
  HistoriqueAttributionUSSD.init(
    {
      ussd_attribution_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      numero_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      numero: {
        type: DataTypes.STRING,
        allowNull: false
      },
      date_attribution: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      motif: {
        type: DataTypes.STRING,
        allowNull: true
      },
      utilisateur_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "HistoriqueAttributionUSSD",
      tableName: "HistoriqueAttributionUSSDs",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );
  return HistoriqueAttributionUSSD;
};
