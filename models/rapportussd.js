"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class RapportUssd extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      RapportUssd.belongsTo(models.USSDAttribution, {
        foreignKey: "ussd_attribution_id"
      });
    }
  }
  RapportUssd.init(
    {
      ussd_attribution_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      ref: {
        type: DataTypes.STRING,
        allowNull: true
      },
      creation_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      revision: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "00"
      },
      ticket: {
        type: DataTypes.STRING,
        allowNull: false
      },
      demandeur: {
        type: DataTypes.STRING,
        allowNull: false
      },
      type_numeros: {
        type: DataTypes.STRING,
        allowNull: false
      },
      type_utilisation: {
        type: DataTypes.STRING,
        allowNull: false
      },
      quantite: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      type_service: {
        type: DataTypes.STRING,
        allowNull: false
      },
      condition_tarifaire: {
        type: DataTypes.STRING,
        allowNull: true
      },
      utilisation_envisagee: {
        type: DataTypes.STRING,
        allowNull: true
      },
      preference_demandeur: {
        type: DataTypes.STRING,
        allowNull: true
      },
      analyse_demande: {
        type: DataTypes.STRING,
        allowNull: true
      },
      conclusion: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "RapportUssd",
      tableName: "RapportUssds",
      underscored: true,
      timestamps: true
    }
  );
  return RapportUssd;
};
