"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class AttributionDecision extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      AttributionDecision.belongsTo(models.AttributionNumero, {
        foreignKey: "attribution_id"
      });
      AttributionDecision.hasMany(models.Renouvellement, {
        foreignKey: "decision_id"
      });

      AttributionDecision.belongsToMany(models.NumeroAttribue, {
        through: models.DecisionNumero,
        foreignKey: "decision_id",
        otherKey: "numero_attribue_id",
        as: "numeros"
      });
    }
  }
  AttributionDecision.init(
    {
      attribution_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Attributions", // Le nom de la table de l'attribution
          key: "id"
        },
        onDelete: "CASCADE"
      },
      duree_utilisation: {
        type: DataTypes.STRING,
        allowNull: true
      },
      reference_decision: {
        type: DataTypes.STRING,
        allowNull: true
      },
      date_attribution: {
        type: DataTypes.DATE,
        allowNull: false
      },
      date_expiration: {
        type: DataTypes.DATE,
        allowNull: true
      },
      type_decision: {
        type: DataTypes.ENUM(
          "modification",
          "reclamation",
          "suspension",
          "attribution",
          "retrait",
          "reservation",
          "renouvellement",
          "résiliation"
        ),
        allowNull: false
      },
      notification_envoyee: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      notification_envoyee_1mois: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      notification_envoyee_1semaine: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      notification_envoyee_jour_j: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      notification_envoyee_1semaine_apres: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      fichier: {
        type: DataTypes.STRING,
        allowNull: true
      },
      etat_autorisation: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: "AttributionDecision",
      tableName: "AttributionDecisions",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );
  return AttributionDecision;
};
