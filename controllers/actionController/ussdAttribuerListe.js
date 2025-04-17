const { UssdAttribuer, USSDAttribution, USSD, UssdDecision, Client } = require("../../models");
const { Op, fn, col } = require("sequelize");

// Fonction pour récupérer tous les USSD attribués avec les conditions spécifiées
exports.getAllUssdAttributions = async (req, res) => {
  try {
    const { statut, client_id, multipleAttributions, ussd_attribue } = req.query;

    // Préparer les conditions de filtrage pour les USSDs attribués
    const whereUssdAttribue = {};
    if (statut) whereUssdAttribue.statut = statut;
    if (ussd_attribue) whereUssdAttribue.ussd_attribue = ussd_attribue;

    // Préparer les conditions de filtrage pour les clients
    const whereClient = {};
    if (client_id) whereClient.id = client_id;

    // Filtrage pour les USSDs ayant plusieurs attributions
    const havingMultipleAttributions =
      multipleAttributions === "true"
        ? {
            [Op.gt]: [fn("COUNT", col("UssdAttribuers.id")), 1] // On compte les attributions
          }
        : {};

    const ussdAttributions = await UssdAttribuer.findAll({
      where: whereUssdAttribue,
      include: [
        {
          model: USSDAttribution,
          include: [
            {
              model: UssdDecision,
              limit: 1,  
              order: [["date_attribution", "DESC"]]  
            },
            {
              model: Client,
              required: client_id ? true : false, 
              where: whereClient  
            }
          ],
          required: true  
        },
        {
          model: USSD, 
          required: true,  
        }
      ],
      group: ["UssdAttribuer.id"],
      having: havingMultipleAttributions,  
      order: [["created_at", "DESC"]] 
    });

    return res.status(200).json({
      success: true,
      message: "Liste des USSD attribués récupérée avec succès",
      ussdAttributions
    });
  } catch (error) {
    console.error("Erreur:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des USSD attribués"
    });
  }
};

// Fonction pour libérer un USSD attribué (mettre son statut à "libre")
exports.libererUssdAttribue = async (req, res) => {
  try {
    const { id } = req.params;
    const ussd = await UssdAttribuer.findByPk(id);

    if (!ussd) {
      return res
        .status(404)
        .json({ success: false, message: "USSD attribué non trouvé" });
    }

    if (ussd.statut === "libre") {
      return res
        .status(400)
        .json({ success: false, message: "Ce USSD est déjà libre" });
    }

    ussd.statut = "libre";
    await ussd.save();

    return res
      .status(200)
      .json({ success: true, message: "USSD attribué libéré avec succès" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Erreur lors de la libération du USSD attribué"
      });
  }
};
