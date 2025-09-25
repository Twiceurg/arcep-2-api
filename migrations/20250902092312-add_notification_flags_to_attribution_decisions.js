"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      "AttributionDecisions",
      "notification_envoyee_1mois",
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Notification envoyée 1 mois avant expiration"
      }
    );

    await queryInterface.addColumn(
      "AttributionDecisions",
      "notification_envoyee_1semaine",
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Notification envoyée 1 semaine avant expiration"
      }
    );

    await queryInterface.addColumn(
      "AttributionDecisions",
      "notification_envoyee_jour_j", // snake_case
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Notification envoyée le jour de l'expiration"
      }
    );

    await queryInterface.addColumn(
      "AttributionDecisions",
      "notification_envoyee_1semaine_apres",
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Notification envoyée 1 semaine après expiration"
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      "AttributionDecisions",
      "notification_envoyee_1mois"
    );
    await queryInterface.removeColumn(
      "AttributionDecisions",
      "notification_envoyee_1semaine"
    );
    await queryInterface.removeColumn(
      "AttributionDecisions",
      "notification_envoyee_jour_j"
    );
    await queryInterface.removeColumn(
      "AttributionDecisions",
      "notification_envoyee_1semaine_apres"
    );
  }
};
