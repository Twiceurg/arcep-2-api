"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class AttributionNumero extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      AttributionNumero.belongsTo(models.Client, { foreignKey: "client_id" });
      AttributionNumero.belongsTo(models.Service, { foreignKey: "service_id" });
      AttributionNumero.belongsTo(models.TypeUtilisation, {
        foreignKey: "type_utilisation_id"
      });
      AttributionNumero.belongsTo(models.Pnn, { foreignKey: "pnn_id" });
      AttributionNumero.belongsTo(models.Utilisation, {
        foreignKey: "utilisation_id"
      });
      AttributionNumero.hasMany(models.NumeroAttribue, {
        foreignKey: "attribution_id"
      });
      AttributionNumero.hasMany(models.Rapport, {
        foreignKey: "attribution_id",
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
      });
      AttributionNumero.hasMany(models.Renouvellement, {
        foreignKey: "attribution_id"
      });
      AttributionNumero.hasMany(models.AttributionDecision, {
        foreignKey: 'attribution_id',
      });
    }
  }
  AttributionNumero.init(
    {
      type_utilisation_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      service_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      pnn_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      client_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      duree_utilisation: {
        type: DataTypes.STRING,
        allowNull: true
      },
      utilisation_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Utilisations",
          key: "id"
        }
      },
      reference_decision: {
        type: DataTypes.STRING,
        allowNull: true
      },
      regle: {
        type: DataTypes.STRING,
        allowNull: true
      },
      date_attribution: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      date_expiration: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      etat_autorisation: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
      }
    },
    {
      sequelize,
      modelName: "AttributionNumero",
      tableName: "AttributionNumeros",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );
  return AttributionNumero;
};
