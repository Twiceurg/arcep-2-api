const { Renouvellement, AttributionNumero } = require("../../models");

const RenouvellementController = {
  // 🔹 Créer un renouvellement
  async createRenouvellement(req, res) {
    try {
      const { attribution_id, decision_renouvellement, date_renouvellement } =
        req.body;

      // Vérifier si l'attribution existe
      const attribution = await AttributionNumero.findByPk(attribution_id);
      if (!attribution) {
        return res
          .status(404)
          .json({ success: false, message: "Attribution non trouvée" });
      }

      // Vérifier si l'attribution a une durée d'utilisation définie
      if (!attribution.duree_utilisation) {
        return res.status(400).json({
          success: false,
          message: "La durée d'utilisation de l'attribution est requise"
        });
      }

      // Vérifier si l'attribution est expirée
      const currentDate = new Date(); // Date actuelle
      const expirationDate = new Date(attribution.date_expiration); // Date d'expiration de l'attribution

      // Si la date d'expiration n'est pas encore passée, l'attribution ne peut pas être renouvelée
      if (expirationDate >= currentDate) {
        return res.status(400).json({
          success: false,
          message:
            "L'attribution n'est pas expirée et ne peut pas être renouvelée."
        });
      }

      // Calculer la date d'expiration du renouvellement
      let dateExpiration = new Date(date_renouvellement);
      dateExpiration.setMonth(
        dateExpiration.getMonth() + attribution.duree_utilisation
      ); // Ajoute la durée à la date de renouvellement

      // Créer le renouvellement avec la date d'expiration calculée
      const renouvellement = await Renouvellement.create({
        attribution_id,
        decision_renouvellement,
        date_renouvellement,
        date_expiration_renouvellement: dateExpiration
      });

      // Mettre à jour l'attribution en définissant 'etat_autorisation' sur true
      await attribution.update({
        etat_autorisation: true,
        date_expiration: dateExpiration // Mettre à jour la date d'expiration de l'attribution
      });

      return res.status(201).json({
        success: true,
        message: "Renouvellement créé avec succès",
        renouvellement
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ success: false, message: "Erreur serveur" });
    }
  },

  // 🔹 Obtenir tous les renouvellements
  async getAllRenouvellements(req, res) {
    try {
      const renouvellements = await Renouvellement.findAll({
        include: { model: AttributionNumero } // Inclure l'attribution associée
      });

      return res.status(200).json({ success: true, renouvellements });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
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
          .status(404)
          .json({ success: false, message: "Renouvellement non trouvé" });
      }

      return res.status(200).json({ success: true, renouvellement });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
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
          .status(404)
          .json({ success: false, message: "Renouvellement non trouvé" });
      }

      // Mettre à jour les champs
      await renouvellement.update({
        decision_renouvellement,
        date_renouvellement,
        date_attribution_renouvellement
      });

      return res.status(200).json({
        success: true,
        message: "Renouvellement mis à jour avec succès",
        renouvellement
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
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
          .status(404)
          .json({ success: false, message: "Renouvellement non trouvé" });
      }

      await renouvellement.destroy();

      return res.status(200).json({
        success: true,
        message: "Renouvellement supprimé avec succès"
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ success: false, message: "Erreur serveur" });
    }
  }
};

module.exports = RenouvellementController;
