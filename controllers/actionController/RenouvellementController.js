const {
  Renouvellement,
  AttributionNumero,
  Service,
  Category,
  AttributionDecision
} = require("../../models");

const RenouvellementController = {
  // 🔹 Créer un renouvellement
  // async createRenouvellement(req, res) {
  //   try {
  //     const { attribution_id, decision_renouvellement, date_renouvellement } =
  //       req.body;

  //     // Vérifier si l'attribution existe
  //     const attribution = await AttributionNumero.findByPk(attribution_id);
  //     if (!attribution) {
  //       return res
  //         .status(404)
  //         .json({ success: false, message: "Attribution non trouvée" });
  //     }

  //     // Vérifier si l'attribution a une durée d'utilisation définie
  //     if (!attribution.duree_utilisation) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "La durée d'utilisation de l'attribution est requise"
  //       });
  //     }

  //     // Vérifier si l'attribution est expirée
  //     const currentDate = new Date(); // Date actuelle
  //     const expirationDate = new Date(attribution.date_expiration); // Date d'expiration de l'attribution

  //     // Si la date d'expiration n'est pas encore passée, l'attribution ne peut pas être renouvelée
  //     if (expirationDate >= currentDate) {
  //       return res.status(400).json({
  //         success: false,
  //         message:
  //           "L'attribution n'est pas expirée et ne peut pas être renouvelée."
  //       });
  //     }

  //     // Calculer la date d'expiration du renouvellement
  //     let dateExpiration = new Date(date_renouvellement);
  //     dateExpiration.setMonth(
  //       dateExpiration.getMonth() + attribution.duree_utilisation
  //     ); // Ajoute la durée à la date de renouvellement

  //     // Créer le renouvellement avec la date d'expiration calculée
  //     const renouvellement = await Renouvellement.create({
  //       attribution_id,
  //       decision_renouvellement,
  //       date_renouvellement,
  //       date_expiration_renouvellement: dateExpiration
  //     });

  //     // Mettre à jour l'attribution en définissant 'etat_autorisation' sur true
  //     await attribution.update({
  //       etat_autorisation: true,
  //       date_expiration: dateExpiration // Mettre à jour la date d'expiration de l'attribution
  //     });

  //     return res.status(201).json({
  //       success: true,
  //       message: "Renouvellement créé avec succès",
  //       renouvellement
  //     });
  //   } catch (error) {
  //     console.error(error);
  //     return res
  //       .status(500)
  //       .json({ success: false, message: "Erreur serveur" });
  //   }
  // },

  async renewAttribution(req, res) {
    try {
      const { attribution_id, decision_renouvellement, date_renouvellement } =
        req.body;
      const file = req.file;

      console.log("Date reçue depuis req.body.date_renouvellement :", date_renouvellement);


      const attribution = await AttributionNumero.findByPk(attribution_id, {
        include: [{ model: Service, include: [{ model: Category }] }]
      });

      if (!attribution) {
        return res .json({success: false, message: "Attribution non trouvée" });
      }

      const categoryId =
        attribution.Service && attribution.Service.Category
          ? attribution.Service.Category.id
          : null;

      if (!decision_renouvellement) {
        return res .json({success: false, message: "La référence est requise" });
      }

      const attributionDate = date_renouvellement
        ? new Date(date_renouvellement)
        : new Date();

      let dateExpiration = null;
      let duree_utilisation = null;

      if (categoryId !== 1) {
        // 🔍 Récupérer la décision initiale pour cette attribution
        const decisionInitiale = await AttributionDecision.findOne({
          where: {
            attribution_id: attribution.id,
            type_decision: "attribution"
          },
          order: [["created_at", "ASC"]]
        });

        if (!decisionInitiale || !decisionInitiale.duree_utilisation) {
          return res .json({success: false,
            message:
              "Durée d'utilisation introuvable dans la décision initiale."
          });
        }

        duree_utilisation = decisionInitiale.duree_utilisation;

        // Recalculer la date d'expiration à partir de la durée
        const match = duree_utilisation.match(/^(\d+)\s*(mois|ans)$/i);
        if (!match) {
          return res
             
            .json({success: false, message: "Durée d'utilisation invalide." });
        }

        const duree = parseInt(match[1], 10);
        const unite = match[2].toLowerCase();
        const dureeEnMois = unite === "ans" ? duree * 12 : duree;

        dateExpiration = new Date(attributionDate);
        dateExpiration.setMonth(dateExpiration.getMonth() + dureeEnMois);
      }

      // ✅ Créer la décision de renouvellement
      const renouvellementDecision = await AttributionDecision.create({
        attribution_id: attribution.id,
        reference_decision: decision_renouvellement,
        date_attribution: attributionDate,
        date_expiration: dateExpiration,
        duree_utilisation, // même durée que la décision initiale
        etat_autorisation: true,
        fichier: file ? `/uploads/${file.filename}` : null,
        type_decision: "renouvellement"
      });

      // ✅ Enregistrer le renouvellement dans la table Renouvellement
      const renouvellement = await Renouvellement.create({
        attribution_id: attribution.id,
        decision_id: renouvellementDecision.id, // Assurez-vous que cette colonne existe
        decision_renouvellement: decision_renouvellement,
        date_renouvellement: attributionDate,
        date_expiration_renouvellement: dateExpiration
      });

      return res. json({
        success: true,
        message: "Renouvellement effectué avec succès",
        renouvellementDecision,
        renouvellement // Ajouter aussi l'enregistrement du renouvellement dans la réponse
      });
    } catch (error) {
      console.error(error);
      return res. json({success: false, message: "Erreur interne du serveur" });
    }
  },

  // 🔹 Obtenir tous les renouvellements
  async getAllRenouvellements(req, res) {
    try {
      const renouvellements = await Renouvellement.findAll({
        include: { model: AttributionNumero } // Inclure l'attribution associée
      });

      return res. json({ success: true, renouvellements });
    } catch (error) {
      console.error(error);
      return res 
        .json({ success: false, message: "Erreur serveur" });
    }
  },

  // 🔹 Obtenir un renouvellement par ID
  async getRenouvellementById(req, res) {
    try {
      const { id } = req.params;

      const renouvellement = await Renouvellement.findByPk(id, {
        include: { model: AttributionNumero, as: "attribution" }
      });

      if (!renouvellement) {
        return res 
          .json({ success: false, message: "Renouvellement non trouvé" });
      }

      return res. json({ success: true, renouvellement });
    } catch (error) {
      console.error(error);
      return res 
        .json({ success: false, message: "Erreur serveur" });
    }
  },

  // 🔹 Mettre à jour un renouvellement
  async updateRenouvellement(req, res) {
    try {
      const { id } = req.params;
      const {
        decision_renouvellement,
        date_renouvellement,
        date_attribution_renouvellement
      } = req.body;

      const renouvellement = await Renouvellement.findByPk(id);
      if (!renouvellement) {
        return res 
          .json({ success: false, message: "Renouvellement non trouvé" });
      }

      // Mettre à jour les champs
      await renouvellement.update({
        decision_renouvellement,
        date_renouvellement,
        date_attribution_renouvellement
      });

      return res. json({
        success: true,
        message: "Renouvellement mis à jour avec succès",
        renouvellement
      });
    } catch (error) {
      console.error(error);
      return res 
        .json({ success: false, message: "Erreur serveur" });
    }
  },

  // 🔹 Supprimer un renouvellement
  async deleteRenouvellement(req, res) {
    try {
      const { id } = req.params;

      const renouvellement = await Renouvellement.findByPk(id);
      if (!renouvellement) {
        return res 
          .json({ success: false, message: "Renouvellement non trouvé" });
      }

      await renouvellement.destroy();

      return res. json({
        success: true,
        message: "Renouvellement supprimé avec succès"
      });
    } catch (error) {
      console.error(error);
      return res 
        .json({ success: false, message: "Erreur serveur" });
    }
  }
};

module.exports = RenouvellementController;
