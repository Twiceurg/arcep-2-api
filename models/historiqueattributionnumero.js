'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class HistoriqueAttributionNumero extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      
      HistoriqueAttributionNumero.belongsTo(models.AttributionNumero, {
        foreignKey: 'attribution_id',
        onDelete: 'CASCADE',
      });
 
      HistoriqueAttributionNumero.belongsTo(models.NumeroAttribue, {
        foreignKey: 'numero_id',
        onDelete: 'CASCADE',
      });
 
      HistoriqueAttributionNumero.belongsTo(models.Utilisateur, {
        foreignKey: 'utilisateur_id',
        onDelete: 'SET NULL',
      });
    }
  }
  HistoriqueAttributionNumero.init({
    attribution_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    numero_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    numero: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date_attribution: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    motif: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'HistoriqueAttributionNumero',
    tableName: 'HistoriqueAttributionNumeros',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });
  return HistoriqueAttributionNumero;
};