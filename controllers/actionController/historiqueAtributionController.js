const {
  HistoriqueAttribution,
  Utilisateur,
  AttributionNumero,
  NumeroAttribue,
  AttributionDecision,
  Service,
  Category,
} = require("../../models");

const historiqueAttributionController = {
  /**
   * Récupérer la liste des historiques liés à une attribution
   */
  async getHistoriqueByAttribution(req, res) {
    try {
      const { attribution_id } = req.params;

      // Vérifier si l'attribution existe
      const attribution = await AttributionNumero.findByPk(attribution_id);
      if (!attribution) {
        return res.status(404).json({ message: "Attribution non trouvée" });
      }

      // Récupérer les historiques liés à cette attribution
      const historique = await HistoriqueAttribution.findAll({
        where: { attribution_id },
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

  async appliquerSuspension(req, res) {
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
      const historique = await HistoriqueAttribution.create({
        attribution_id: attributionId,
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
      // await AttributionNumero.update(
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

  async assignReference(req, res) {
    try {
      const { id } = req.params;
      const { reference_decision, date_attribution, duree_utilisation } =
        req.body;
      const file = req.file;

      // Vérifier si l'attribution existe
      const attribution = await AttributionNumero.findByPk(id, {
        include: [{ model: Service, include: [{ model: Category }] }]
      });

      if (!attribution) {
        return res.status(404).json({ message: "Attribution non trouvée" });
      }

      // Vérifier si l'historique existe avec l'id passé dans la requête
      const historique = await HistoriqueAttribution.findByPk(id); // On utilise directement l'id ici

      if (!historique) {
        return res.status(404).json({ message: "Historique non trouvé" });
      }

      // Mise à jour de la date de début si fournie
      if (date_attribution) {
        historique.date_debut = new Date(date_attribution);
      }

      // Mise à jour de la durée de suspension si fournie
      if (duree_utilisation) {
        historique.duree_suspension = duree_utilisation;
      }

      // Calcul de la date de fin de suspension à partir de la durée
      let dureeEnMois = 0;
      if (duree_utilisation) {
        const dureeMatch = duree_utilisation.match(/^(\d+)\s*(mois|ans)$/i);
        if (dureeMatch) {
          dureeEnMois = parseInt(dureeMatch[1], 10);
          if (dureeMatch[2].toLowerCase() === "ans") {
            dureeEnMois *= 12; // Convertir les années en mois
          }
        }
      }

      // Calcul de la date de fin de suspension si une durée est fournie
      if (dureeEnMois > 0) {
        let date_fin_suspension = new Date(historique.date_debut);
        date_fin_suspension.setMonth(
          date_fin_suspension.getMonth() + dureeEnMois
        );
        historique.date_fin_suspension = date_fin_suspension;
      }

      // Récupérer le numéro attribué
      const numeroAttribue = await NumeroAttribue.findOne({
        where: { attribution_id: attribution.id }
      });

      if (!numeroAttribue) {
        return res.status(404).json({ message: "Numéro attribué non trouvé" });
      }

      // Modifier le statut du numéro attribué
      numeroAttribue.statut = "suspendu";
      await numeroAttribue.save();

      // Mise à jour de l'historique
      historique.appliquee = true; // Appliquer les changements
      historique.reference_modification = reference_decision;

      await historique.save();

      // Création de la décision d'attribution
      const attributionDecision = await AttributionDecision.create({
        attribution_id: attribution.id,
        reference_decision,
        date_attribution: historique.date_debut,
        date_expiration: historique.date_fin_suspension,
        duree_utilisation: historique.duree_suspension,
        etat_autorisation: true,
        fichier: `/uploads/${file.filename}`
      });

      // Réponse si l'attribution et la décision ont été bien mises à jour
      return res.status(200).json({
        success: true,
        message: "Référence assignée et historique mis à jour avec succès",
        attributionDecision
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }
};

module.exports = historiqueAttributionController;
