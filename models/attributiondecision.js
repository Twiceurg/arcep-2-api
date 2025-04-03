'use strict';
const {
  Model
} = require('sequelize');
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
        foreignKey: 'attribution_id',
      });
    }
  }
  AttributionDecision.init({
    attribution_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Attributions', // Le nom de la table de l'attribution
        key: 'id'
      },
      onDelete: 'CASCADE',
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
    fichier: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    etat_autorisation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'AttributionDecision',
    tableName: "AttributionDecisions",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  });
  return AttributionDecision;
};