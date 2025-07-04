"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class DecisionNumero extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      DecisionNumero.belongsTo(models.NumeroAttribue, {
        foreignKey: "numero_attribue_id"
      });
      DecisionNumero.belongsTo(models.AttributionDecision, {
        foreignKey: "decision_id"
      });
    }
  }
  DecisionNumero.init(
    {
      numero_attribue_id: DataTypes.INTEGER,
      decision_id: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: "DecisionNumero",
      tableName: "DecisionNumeros",
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  );
  return DecisionNumero;
};
