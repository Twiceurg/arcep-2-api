const cron = require("node-cron");
const {
  AttributionDecision,
  NumeroAttribue,
  AttributionNumero
} = require("../models");
const Sequelize = require("sequelize");

// Fonction pour vérifier les expirations et désactiver les décisions
const verifierExpirationEtDesactiver = async () => {
  try {
    const decisions = await AttributionDecision.findAll({
      where: {
        date_expiration: {
          [Sequelize.Op.ne]: null,
          [Sequelize.Op.lt]: new Date()
        },
        etat_autorisation: true
      },
      include: [
        {
          model: AttributionNumero,
          include: [
            {
              model: NumeroAttribue
            }
          ]
        }
      ]
    });

    for (let decision of decisions) {
      console.log("Type de décision :", decision.type_decision); 
      if (decision.type_decision === "suspension") {
        const attribution = decision.AttributionNumero;
 
        if (attribution && attribution.NumeroAttribues) { 
          for (let numero of attribution.NumeroAttribues) {
            console.log("Vérification du numéro :", numero.numero_attribue);
 
            if (numero.statut === "suspendu") {
              numero.statut = "attribue";  
              await numero.save();
              console.log(
                `Numéro ${numero.numero_attribue} remis à attribue en raison de l'expiration de la suspension.`
              );
            } else {
              console.log(
                `Le statut du numéro ${numero.numero_attribue} n'est pas suspendu, il est ${numero.statut}`
              );
            }
          }
        } else {
          console.log(
            `Aucune attribution ou aucun numéro associé pour la décision ${decision.id}`
          );
        }
      }
 
      decision.etat_autorisation = false;
      await decision.save();
      console.log(
        `Décision ${decision.id} désactivée en raison de l'expiration.`
      );
    }
  } catch (error) {
    console.error("Erreur lors de la vérification des expirations:", error);
  }
};

// Cette tâche s'exécute tous les jours à minuit
cron.schedule("0 0 * * *", () => {
  console.log("Vérification des expirations des décisions...");
  verifierExpirationEtDesactiver();
});
