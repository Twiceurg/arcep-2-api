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
    }
  }
  Pnn.init(
    {
      partition_prefix: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      partition_length: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      bloc_min: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      block_max: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      // length_number: {
      //   type: DataTypes.INTEGER,
      //   allowNull: false
      // },
      service_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
