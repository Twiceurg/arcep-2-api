"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class NumeroAttribue extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      NumeroAttribue.belongsTo(models.AttributionNumero, {
        foreignKey: "attribution_id"
      });
      NumeroAttribue.belongsTo(models.Pnn, { foreignKey: "pnn_id" });
      NumeroAttribue.hasMany(models.HistoriqueAttributionNumero, {
        foreignKey: "numero_id"
      });
      NumeroAttribue.belongsTo(models.Utilisation, {
        foreignKey: "utilisation_id"
      });
    }
  }
  NumeroAttribue.init(
    {
      attribution_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "AttributionNumeros",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      utilisation_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Utilisations",
          key: "id"
        }
      },
      date_attribution: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      pnn_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      statut: {
        type: DataTypes.ENUM(
          "libre",
          "attribue",
          "suspendu",
          "retiré",
          "résiliation"
        ),
        defaultValue: "attribue"
      },
      numero_attribue: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "NumeroAttribue",
      tableName: "NumeroAttribues",
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );
  return NumeroAttribue;
};
