"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Ajouter des associations si nécessaire
      Category.hasMany(models.Service, { foreignKey: 'category_id' });
      Category.hasMany(models.Pnn, { foreignKey: 'category_id' });
      Category.hasMany(models.Utilisation, {
        foreignKey: 'category_id', 
      });
    }
  }

  // Initialisation du modèle
  Category.init(
    {
      nom: {
        type: DataTypes.STRING,
        allowNull: false  
      }
    },
    {
      sequelize,
      modelName: "Category",
      tableName: "Categories",
      underscored: true,
      timestamps: true
    }
  );

  return Category;
};
