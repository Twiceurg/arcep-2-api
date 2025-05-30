const {
  USSDAttribution,
  UssdDecision,
  UssdRenouvellement
} = require("../../models");

const renewUssdAttribution = async (req, res) => {
  try {
    const { ussd_attribution_id, decision_renouvellement, date_renouvellement } =
      req.body;
    const file = req.file;

    const attribution = await USSDAttribution.findByPk(ussd_attribution_id);
    if (!attribution) {
      return res.status(404).json({ message: "Attribution non trouvée" });
    }

    if (!decision_renouvellement) {
      return res.status(400).json({ message: "La référence est requise" });
    }

    const attributionDate = date_renouvellement
      ? new Date(date_renouvellement)
      : new Date();

    // 🔍 Récupérer la décision initiale pour cette attribution
    const decisionInitiale = await UssdDecision.findOne({
      where: {
        ussd_attribution_id: attribution.id,
        type_decision: "attribution"
      },
      order: [["created_at", "ASC"]]
    });

    if (!decisionInitiale || !decisionInitiale.duree_utilisation) {
      return res.status(400).json({
        message: "Durée d'utilisation introuvable dans la décision initiale."
      });
    }

    const duree_utilisation = decisionInitiale.duree_utilisation;

    // 🧮 Calcul de la date d'expiration
    const match = duree_utilisation.match(/^(\d+)\s*(mois|ans)$/i);
    if (!match) {
      return res.status(400).json({ message: "Durée d'utilisation invalide." });
    }

    const duree = parseInt(match[1], 10);
    const unite = match[2].toLowerCase();
    const dureeEnMois = unite === "ans" ? duree * 12 : duree;

    const dateExpiration = new Date(attributionDate);
    dateExpiration.setMonth(dateExpiration.getMonth() + dureeEnMois);

    // ✅ Créer la décision de renouvellement
    const renouvellementDecision = await UssdDecision.create({
      ussd_attribution_id: attribution.id,
      reference_decision: decision_renouvellement,
      date_attribution: attributionDate,
      date_expiration: dateExpiration,
      duree_utilisation,
      etat_autorisation: true,
      fichier: file ? `/uploads/${file.filename}` : null,
      type_decision: "renouvellement"
    });

    // ✅ Enregistrer dans la table de renouvellement
    const renouvellement = await UssdRenouvellement.create({
      ussd_attribution_id: attribution.id,
      ussd_decision_id: renouvellementDecision.id,
      decision_renouvellement,
      date_renouvellement: attributionDate,
      date_expiration_renouvellement: dateExpiration
    });

    return res.status(200).json({
      success: true,
      message: "Renouvellement effectué avec succès",
      renouvellementDecision,
      renouvellement
    });
  } catch (error) {
    console.error("Erreur lors du renouvellement :", error);
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
};

const getAllUssdRenouvellement = async (req, res) => {
  try {
    const renouvellements = await UssdRenouvellement.findAll({
      include: [
        {
          model: USSDAttribution
        },
        {
          model: UssdDecision
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    return res.status(200).json({
      success: true,
      data: renouvellements
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des renouvellements :",
      error
    );
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
};

const getUssdRenouvellementById = async (req, res) => {
  try {
    const { id } = req.params;

    const renouvellement = await UssdRenouvellement.findByPk(id, {
      include: [
        {
          model: USSDAttribution
        },
        {
          model: UssdDecision
        }
      ]
    });

    if (!renouvellement) {
      return res.status(404).json({ message: "Renouvellement non trouvé" });
    }

    return res.status(200).json({
      success: true,
      data: renouvellement
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du renouvellement :", error);
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
};
module.exports = {
  renewUssdAttribution,
  getAllUssdRenouvellement,
  getUssdRenouvellementById
};
