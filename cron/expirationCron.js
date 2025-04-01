const cron = require('node-cron');
const { AttributionNumero } = require('../models');  
const Sequelize = require('sequelize');
 
const verifierExpirationEtDesactiver = async () => {
  try {
    const attributions = await AttributionNumero.findAll({
        where: {
          date_expiration: {
            [Sequelize.Op.ne]: null, 
            [Sequelize.Op.lt]: new Date() 
          },
          etat_autorisation: true
        }
      });
      

    for (let attribution of attributions) {
      attribution.etat_autorisation = false;
      await attribution.save();
      console.log(`Attribution ${attribution.id} désactivée en raison de l'expiration.`);
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des expirations:', error);
  }
};
 
cron.schedule('0 0 * * *', () => {
    console.log('Vérification des expirations des attributions...');
    verifierExpirationEtDesactiver();
  });

