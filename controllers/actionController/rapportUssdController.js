const { RapportUssd, USSDAttribution } = require("../../models");

class RapportUssdController {
  // ✅ 1. Créer un rapport USSD
  static async createRapportUssd(req, res) {
    try {
      const {
        ussd_attribution_id,
        revision = "00",
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
      const attribution = await USSDAttribution.findByPk(ussd_attribution_id);
      if (!attribution) {
        return res.status(404).json({
          success: false,
          message: "Attribution USSD introuvable"
        });
      }

      // Vérifier si un rapport existe déjà pour cette attribution
      const existing = await RapportUssd.findOne({
        where: { ussd_attribution_id }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Cette attribution USSD a déjà un rapport"
        });
      }

      const rapport = await RapportUssd.create({
        ussd_attribution_id,
        creation_date: new Date(),
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

      return res.status(201).json({
        success: true,
        message: "Rapport USSD créé avec succès",
        rapport
      });
    } catch (error) {
      console.error("Erreur création rapport USSD:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }

  // ✅ 2. Récupérer un rapport par ID
  static async getRapportUssdById(req, res) {
    try {
      const { id } = req.params;
      const rapport = await RapportUssd.findByPk(id, {
        include: [{ model: USSDAttribution }]
      });

      if (!rapport) {
        return res.status(404).json({
          success: false,
          message: "Rapport USSD introuvable"
        });
      }

      return res.status(200).json({ success: true, rapport });
    } catch (error) {
      console.error("Erreur récupération rapport USSD:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }

  // ✅ 3. Récupérer tous les rapports
  static async getAllRapportUssds(req, res) {
    try {
      const rapports = await RapportUssd.findAll({
        include: [{ model: USSDAttribution }]
      });

      return res.status(200).json({ success: true, rapports });
    } catch (error) {
      console.error("Erreur récupération rapports USSD:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }

  // ✅ 4. Récupérer tous les rapports d'une attribution
  static async getRapportsUssdByAttribution(req, res) {
    try {
      const { ussd_attribution_id } = req.params;

      const attribution = await USSDAttribution.findByPk(ussd_attribution_id);
      if (!attribution) {
        return res.status(404).json({
          success: false,
          message: "Attribution USSD introuvable"
        });
      }

      const rapports = await RapportUssd.findAll({
        where: { ussd_attribution_id }
      });

      return res.status(200).json({ success: true, rapports });
    } catch (error) {
      console.error("Erreur récupération rapports USSD par attribution:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }

  // ✅ 5. Mettre à jour un rapport
  static async updateRapportUssd(req, res) {
    try {
      const { id } = req.params;
      const updatedData = req.body;

      const rapport = await RapportUssd.findByPk(id);
      if (!rapport) {
        return res.status(404).json({
          success: false,
          message: "Rapport USSD introuvable"
        });
      }

      await rapport.update(updatedData);

      return res.status(200).json({
        success: true,
        message: "Rapport USSD mis à jour avec succès",
        rapport
      });
    } catch (error) {
      console.error("Erreur mise à jour rapport USSD:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }

  // ✅ 6. Supprimer un rapport
  static async deleteRapportUssd(req, res) {
    try {
      const { id } = req.params;

      const rapport = await RapportUssd.findByPk(id);
      if (!rapport) {
        return res.status(404).json({
          success: false,
          message: "Rapport USSD introuvable"
        });
      }

      await rapport.destroy();

      return res.status(200).json({
        success: true,
        message: "Rapport USSD supprimé avec succès"
      });
    } catch (error) {
      console.error("Erreur suppression rapport USSD:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }
}

module.exports = RapportUssdController;
