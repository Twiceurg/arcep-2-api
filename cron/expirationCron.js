const cron = require('node-cron');
const { AttributionDecision } = require('../models');  
const Sequelize = require('sequelize');

const verifierExpirationEtDesactiver = async () => {
  try {
    const decisions = await AttributionDecision.findAll({
      where: {
        date_expiration: {
          [Sequelize.Op.ne]: null,      // S'assurer que la date d'expiration existe
          [Sequelize.Op.lt]: new Date() // Date d'expiration dépassée
        },
        etat_autorisation: true          // Seulement les décisions encore actives
      }
    });

    for (let decision of decisions) {
      decision.etat_autorisation = false;
      await decision.save();
      console.log(`Décision ${decision.id} désactivée en raison de l'expiration.`);
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des expirations:', error);
  }
};

// Cette tâche s'exécute tous les jours à minuit
cron.schedule('0 0 * * *', () => {
  console.log('Vérification des expirations des décisions...');
  verifierExpirationEtDesactiver();
});
