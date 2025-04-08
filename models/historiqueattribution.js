"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class HistoriqueAttribution extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      HistoriqueAttribution.belongsTo(models.AttributionNumero, {
        foreignKey: "attribution_id"
      });
      HistoriqueAttribution.belongsTo(models.Utilisateur, {
        foreignKey: "utilisateur_id"
      });
    }
  }
  HistoriqueAttribution.init(
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
      utilisateur_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Utilisateurs",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
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
        type: DataTypes.ENUM("modification", "reclamation", "suspension","résiliation"),
        allowNull: false
      },
      fichier: {
        type: DataTypes.STRING,
        allowNull: true,
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
      }
    },
    {
      sequelize,
      modelName: "HistoriqueAttribution",
      tableName: "HistoriqueAttributions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );
  return HistoriqueAttribution;
};
