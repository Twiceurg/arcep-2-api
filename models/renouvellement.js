"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Renouvellement extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Renouvellement.belongsTo(models.AttributionNumero, {
        foreignKey: "attribution_id"
      });
      Renouvellement.belongsTo(models.AttributionDecision, {
        foreignKey: "decision_id"
      });
    }
  }
  Renouvellement.init(
    {
      attribution_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "AttributionNumeros",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      decision_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "AttributionDecisions",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
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
      modelName: "Renouvellement",
      tableName: "Renouvellements",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );
  return Renouvellement;
};
