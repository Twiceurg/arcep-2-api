"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Pnn extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Pnn.belongsTo(models.Service, {
        foreignKey: "service_id"
      });

      Pnn.hasMany(models.AttributionNumero, {
        foreignKey: "pnn_id",
        as: "attributions"
      });
      Pnn.hasMany(models.NumeroAttribue, {
        foreignKey: "pnn_id"
      });
      Pnn.belongsTo(models.Category, { foreignKey: "category_id" });
      Pnn.belongsTo(models.Utilisation, { foreignKey: "utilisation_id" });
      Pnn.belongsTo(models.ZoneUtilisation, {
        foreignKey: "zone_utilisation_id"
      });
    }
  }
  Pnn.init(
    {
      partition_prefix: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      partition_prefix_b: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      partition_length: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      bloc_min: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      zone_utilisation_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      block_max: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      etat: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      utilisation_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Utilisations",
          key: "id"
        }
      },
      // length_number: {
      //   type: DataTypes.INTEGER,
      //   allowNull: false
      // },
      service_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Services",
          key: "id"
        }
      }
    },
    {
      sequelize,
      modelName: "Pnn",
      tableName: "Pnns",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );

  return Pnn;
};
