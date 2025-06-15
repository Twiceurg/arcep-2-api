'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TypeUtilisationAttributionNumero extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      
    }
  }
  TypeUtilisationAttributionNumero.init({
    type_utilisation_id: DataTypes.INTEGER,
    attribution_numero_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'TypeUtilisationAttributionNumero',
  });
  return TypeUtilisationAttributionNumero;
};