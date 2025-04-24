const {
  UssdAttributionHistorique,
  Utilisateur,
  USSDAttribution,
  UssdAttribuer,
  UssdDecision
} = require("../../models");

const historiqueUSSDAttributionController = {
  /**
   * Récupérer la liste des historiques liés à une attribution
   */
  async getUssdHistoriqueByAttribution(req, res) {
    try {
      const { ussd_attribution_id } = req.params;

      // Vérifier si l'attribution existe
      const attribution = await USSDAttribution.findByPk(ussd_attribution_id);
      if (!attribution) {
        return res.status(404).json({ message: "Attribution non trouvée" });
      }

      // Récupérer les historiques liés à cette attribution
      const historique = await UssdAttributionHistorique.findAll({
        where: { ussd_attribution_id },
        include: [
          {
            model: Utilisateur
          }
        ],
        order: [["created_at", "DESC"]]
      });

      return res.status(200).json(historique);
    } catch (error) {
      console.error("Erreur lors de la récupération de l'historique :", error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  },

  async appliquerUssdSuspension(req, res) {
    try {
      console.log(req.body); // Pour voir ce qui est reçu
      console.log(req.file); // Pour voir si le fichier a été correctement envoyé

      const utilisateurId = req.user.id;

      // Déstructuration des données dans req.body
      const { attributionId, motif, dateDebut, dureeSuspension } = req.body;
      let fichierUrl = req.file ? `/uploads/${req.file.filename}` : null; // Vérification si un fichier est présent

      // Vérification des données obligatoires
      if (!attributionId || !motif || !dateDebut || !dureeSuspension) {
        return res.status(400).json({
          message:
            "Données manquantes : attributionId, motif, dateDebut, ou dureeSuspension."
        });
      }

      // Vérification de la validité de la date de début
      const dateDebutObj = new Date(dateDebut);
      if (isNaN(dateDebutObj.getTime())) {
        return res.status(400).json({ message: "Date de début invalide." });
      }

      // Vérification et extraction de la durée de suspension (mois ou années)
      const match = dureeSuspension.match(/^(\d+)\s*(mois|ans)$/i);
      if (!match) {
        return res.status(400).json({
          message:
            "Durée invalide. Veuillez spécifier la durée (ex: 3 mois ou 2 ans)."
        });
      }

      const duree = parseInt(match[1], 10);
      const unite = match[2].toLowerCase();
      let dureeEnMois = duree;

      if (unite === "ans") {
        dureeEnMois *= 12; // Convertir en mois si c'est en années
      }

      // Calcul de la date de fin de suspension
      const dateFinSuspension = new Date(dateDebutObj);
      dateFinSuspension.setMonth(dateDebutObj.getMonth() + dureeEnMois);

      // Créer l'entrée d'historique de suspension
      const historique = await UssdAttributionHistorique.create({
        ussd_attribution_id: attributionId,
        reference_modification: null, // Reference initiale
        motif: motif,
        utilisateur_id: utilisateurId,
        type_modification: "suspension", // Type de modification
        date_debut: dateDebut, // Date de début de la suspension
        duree_suspension: dureeSuspension, // Durée de la suspension (en mois ou années)
        date_fin_suspension: dateFinSuspension, // Date de fin calculée
        appliquee: false, // Marquer comme non appliquée
        fichier: fichierUrl // URL du fichier ajouté à l'historique
      });

      // Optionnel : Marquer l'attribution comme suspendue si nécessaire
      // await USSDAttribution.update(
      //   { statut: "suspendu" }, // Le statut devient suspendu
      //   { where: { id: attributionId } }
      // );

      // Répondre avec succès
      return res.status(200).json({
        success: true,
        message:
          "Suspension appliquée avec succès, référence de décision à appliquer ultérieurement.",
        historique: historique
      });
    } catch (error) {
      console.error("Erreur lors de l'application de la suspension :", error);
      return res.status(500).json({ message: "Erreur interne du serveur." });
    }
  },

  async appliquerUssdRetrait(req, res) {
    try {
      console.log(req.body);
      console.log(req.file);

      const utilisateurId = req.user.id;
      const { attributionId, motif, dateDebut } = req.body;
      let fichierUrl = req.file ? `/uploads/${req.file.filename}` : null;

      // Vérification des champs obligatoires
      if (!attributionId || !motif || !dateDebut) {
        return res.status(400).json({
          message: "Données manquantes : attributionId, motif ou dateDebut."
        });
      }

      // Vérification de la validité de la date de début
      const dateDebutObj = new Date(dateDebut);
      if (isNaN(dateDebutObj.getTime())) {
        return res.status(400).json({ message: "Date de début invalide." });
      }

      // Création de l'entrée d'historique sans durée ni date de fin
      const historique = await UssdAttributionHistorique.create({
        ussd_attribution_id: attributionId,
        reference_modification: null,
        motif: motif,
        utilisateur_id: utilisateurId,
        type_modification: "retrait",
        date_debut: dateDebut,
        duree_suspension: null,
        date_fin_suspension: null,
        appliquee: false,
        fichier: fichierUrl
      });

      return res.status(200).json({
        success: true,
        message:
          "Retrait appliqué avec succès, référence de décision à appliquer ultérieurement.",
        historique: historique
      });
    } catch (error) {
      console.error("Erreur lors de l'application du retrait :", error);
      return res.status(500).json({ message: "Erreur interne du serveur." });
    }
  },

  async appliquerUssdRésiliation(req, res) {
    try {
      console.log(req.body);
      console.log(req.file);

      const utilisateurId = req.user.id;
      const { attributionId, motif, dateDebut } = req.body;
      let fichierUrl = req.file ? `/uploads/${req.file.filename}` : null;

      // Vérification des champs obligatoires
      if (!attributionId || !motif || !dateDebut) {
        return res.status(400).json({
          message: "Données manquantes : attributionId, motif ou dateDebut."
        });
      }

      // Vérification de la validité de la date de début
      const dateDebutObj = new Date(dateDebut);
      if (isNaN(dateDebutObj.getTime())) {
        return res.status(400).json({ message: "Date de début invalide." });
      }

      // Création de l'entrée d'historique sans durée ni date de fin
      const historique = await UssdAttributionHistorique.create({
        ussd_attribution_id: attributionId,
        reference_modification: null,
        motif: motif,
        utilisateur_id: utilisateurId,
        type_modification: "résiliation",
        date_debut: dateDebut,
        duree_suspension: null,
        date_fin_suspension: null,
        appliquee: false,
        fichier: fichierUrl
      });

      return res.status(200).json({
        success: true,
        message:
          "Résiliation appliqué avec succès, référence de décision à appliquer ultérieurement.",
        historique: historique
      });
    } catch (error) {
      console.error("Erreur lors de l'application de Résiliation :", error);
      return res.status(500).json({ message: "Erreur interne du serveur." });
    }
  },

  async assignUssdReference(req, res) {
    try {
      const { id } = req.params;
      const { reference_decision, date_attribution, duree_utilisation } = req.body;
      const file = req.file;
  
      const historique = await UssdAttributionHistorique.findByPk(id, {
        include: [{ model: USSDAttribution }]
      });
  
      if (!historique) {
        return res.status(404).json({ message: "Historique non trouvé" });
      }
  
      const attribution = historique.USSDAttribution;
  
      // Fonction utilitaire
      const updateHistoriqueAndCreateDecision = async (decisionType, status, additionalData = {}) => {
        historique.appliquee = true;
        historique.reference_modification = reference_decision;
        historique.fichier = file ? `/uploads/${file.filename}` : null;
        await historique.save();
  
        const numeroAttribue = await UssdAttribuer.findOne({
          where: { ussd_attribution_id: attribution.id }
        });
  
        if (!numeroAttribue) {
          return res.status(404).json({ message: "Numéro attribué non trouvé" });
        }
  
        numeroAttribue.statut = status;
        await numeroAttribue.save();
  
        const attributionDecision = await UssdDecision.create({
          ussd_attribution_id: attribution.id,
          reference_decision,
          date_attribution: additionalData.date_attribution || historique.date_debut,
          date_expiration: additionalData.date_expiration || null,
          duree_utilisation: additionalData.duree_utilisation || null,
          etat_autorisation: true,
          fichier: file ? `/uploads/${file.filename}` : null,
          type_decision: decisionType
        });
  
        return res.status(200).json({
          success: true,
          message: `${decisionType.charAt(0).toUpperCase() + decisionType.slice(1)} appliqué avec succès`,
          attributionDecision
        });
      };
  
      // Gérer chaque type de modification
      switch (historique.type_modification) {
        case "modification":
        case "reclamation": {
          const lastAttributionDecision = await UssdDecision.findOne({
            where: {
              ussd_attribution_id: attribution.id,
              type_decision: "attribution"
            },
            order: [["created_at", "ASC"]]
          });
  
          if (!lastAttributionDecision) {
            return res.status(404).json({ message: "Aucune décision d'attribution trouvée" });
          }
  
          historique.duree_suspension = lastAttributionDecision.duree_utilisation;
  
          return await updateHistoriqueAndCreateDecision(
            historique.type_modification,
            "actif",
            {
              date_attribution: lastAttributionDecision.date_attribution,
              date_expiration: lastAttributionDecision.date_expiration,
              duree_utilisation: lastAttributionDecision.duree_utilisation
            }
          );
        }
  
        case "retrait":
          return await updateHistoriqueAndCreateDecision("retrait", "retiré");
  
        case "résiliation":
          return await updateHistoriqueAndCreateDecision("résiliation", "résiliation");
      }
  
      // Si aucun des cas précédents n’a été exécuté, on gère la suspension
      if (date_attribution) {
        historique.date_debut = new Date(date_attribution);
      }
  
      if (duree_utilisation) {
        historique.duree_suspension = duree_utilisation;
  
        const dureeMatch = duree_utilisation.match(/^(\d+)\s*(mois|ans)$/i);
        if (dureeMatch) {
          let dureeEnMois = parseInt(dureeMatch[1], 10);
          if (dureeMatch[2].toLowerCase() === "ans") {
            dureeEnMois *= 12;
          }
  
          const dateFin = new Date(historique.date_debut);
          dateFin.setMonth(dateFin.getMonth() + dureeEnMois);
          historique.date_fin_suspension = dateFin;
        }
      }
  
      const numeroAttribue = await UssdAttribuer.findOne({
        where: { ussd_attribution_id: attribution.id }
      });
  
      if (!numeroAttribue) {
        return res.status(404).json({ message: "Numéro attribué non trouvé" });
      }
  
      numeroAttribue.statut = "suspendu";
      await numeroAttribue.save();
  
      historique.appliquee = true;
      historique.reference_modification = reference_decision;
      historique.fichier = file ? `/uploads/${file.filename}` : null;
      await historique.save();
  
      const attributionDecision = await UssdDecision.create({
        ussd_attribution_id: attribution.id,
        reference_decision,
        date_attribution: historique.date_debut,
        date_expiration: historique.date_fin_suspension,
        duree_utilisation: historique.duree_suspension,
        etat_autorisation: true,
        fichier: file ? `/uploads/${file.filename}` : null,
        type_decision: "suspension"
      });
  
      return res.status(200).json({
        success: true,
        message: "Suspension appliquée avec succès",
        attributionDecision
      });
  
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }
  
};

module.exports = historiqueUSSDAttributionController;
