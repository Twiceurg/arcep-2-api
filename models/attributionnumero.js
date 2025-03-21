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
      AttributionNumero.belongsTo(models.TypeUtilisation, { foreignKey: "type_utilisation_id" });
      AttributionNumero.belongsTo(models.Pnn, { foreignKey: "pnn_id" });
   
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
        type: DataTypes.INTEGER,
        allowNull: true
      },
      numero_attribue: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      reference_decision: {
        type: DataTypes.STRING,
        allowNull: true
      },
      date_attribution: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
      },
      date_expiration: {
        type: DataTypes.DATE,
        allowNull: true
      },
      etat_autorisation: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
