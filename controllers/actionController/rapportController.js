const { Rapport, AttributionNumero } = require("../../models");

class RapportController {
  // ✅ 1. Créer un rapport
  static async createRapport(req, res) {
    try {
      const {
        attribution_id,
        ref,
        creation_date,
        revision,
        ticket,
        demandeur,
        type_numeros,
        type_utilisation,
        quantite,
        type_service,
        condition_tarifaire,
        utilisation_envisagee,
        preference_demandeur,
        analyse_demande,
        conclusion
      } = req.body;

      // Vérifier si l'attribution existe
      const attribution = await AttributionNumero.findByPk(attribution_id);
      if (!attribution) {
        return res
          .status(404)
          .json({ success: false, message: "Attribution introuvable" });
      }

      // Création du rapport
      const rapport = await Rapport.create({
        attribution_id,
        ref,
        creation_date,
        revision,
        ticket,
        demandeur,
        type_numeros,
        type_utilisation,
        quantite,
        type_service,
        condition_tarifaire,
        utilisation_envisagee,
        preference_demandeur,
        analyse_demande,
        conclusion
      });

      return res
        .status(201)
        .json({ success: true, message: "Rapport créé avec succès", rapport });
    } catch (error) {
      console.error("Erreur lors de la création du rapport :", error);
      return res
        .status(500)
        .json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // ✅ 2. Récupérer un rapport par ID
  static async getRapportById(req, res) {
    try {
      const { id } = req.params;
      const rapport = await Rapport.findByPk(id, {
        include: [{ model: AttributionNumero }]
      });

      if (!rapport) {
        return res
          .status(404)
          .json({ success: false, message: "Rapport introuvable" });
      }

      return res.status(200).json({ success: true, rapport });
    } catch (error) {
      console.error("Erreur lors de la récupération du rapport :", error);
      return res
        .status(500)
        .json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // ✅ 3. Récupérer tous les rapports
  static async getAllRapports(req, res) {
    try {
      const rapports = await Rapport.findAll({
        include: [{ model: AttributionNumero }]
      });

      return res.status(200).json({ success: true, rapports });
    } catch (error) {
      console.error("Erreur lors de la récupération des rapports :", error);
      return res
        .status(500)
        .json({ success: false, message: "Erreur interne du  ok serveur" });
    }
  }

  // ✅ 4. Récupérer tous les rapports d'une attribution
  static async getRapportsByAttribution(req, res) {
    try {
      const { attribution_id } = req.params;

      // Vérifier si l'attribution existe
      const attribution = await AttributionNumero.findByPk(attribution_id);
      if (!attribution) {
        return res
          .status(404)
          .json({ success: false, message: "Attribution introuvable" });
      }

      const rapports = await Rapport.findAll({
        where: { attribution_id }
      });

      return res.status(200).json({ success: true, rapports });
    } catch (error) {
      console.error("Erreur lors de la récupération des rapports :", error);
      return res
        .status(500)
        .json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // ✅ 5. Mettre à jour un rapport
  static async updateRapport(req, res) {
    try {
      const { id } = req.params;
      const updatedData = req.body;

      const rapport = await Rapport.findByPk(id);
      if (!rapport) {
        return res
          .status(404)
          .json({ success: false, message: "Rapport introuvable" });
      }

      await rapport.update(updatedData);

      return res
        .status(200)
        .json({
          success: true,
          message: "Rapport mis à jour avec succès",
          rapport
        });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du rapport :", error);
      return res
        .status(500)
        .json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // ✅ 6. Supprimer un rapport
  static async deleteRapport(req, res) {
    try {
      const { id } = req.params;

      const rapport = await Rapport.findByPk(id);
      if (!rapport) {
        return res
          .status(404)
          .json({ success: false, message: "Rapport introuvable" });
      }

      await rapport.destroy();

      return res
        .status(200)
        .json({ success: true, message: "Rapport supprimé avec succès" });
    } catch (error) {
      console.error("Erreur lors de la suppression du rapport :", error);
      return res
        .status(500)
        .json({ success: false, message: "Erreur interne du serveur" });
    }
  }
}

module.exports = RapportController;
