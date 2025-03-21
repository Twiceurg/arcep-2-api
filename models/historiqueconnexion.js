'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class HistoriqueConnexion extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      HistoriqueConnexion.belongsTo(models.Utilisateur, {
        foreignKey: "utilisateur_id",  
        as: "utilisateur",  
      });
    }
  }
  HistoriqueConnexion.init({
    utilisateur_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Utilisateurs", 
        key: "id",  
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    date_connexion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    adresse_ip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'HistoriqueConnexion',
    tableName: "HistoriqueConnexions", 
    underscored: true,  
    timestamps: true,  
    createdAt: "created_at",
    updatedAt: "updated_at",
  });
  return HistoriqueConnexion;
};