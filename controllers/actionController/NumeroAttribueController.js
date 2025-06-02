const {
  NumeroAttribue,
  AttributionNumero,
  AttributionDecision,
  Client
} = require("../../models");

const { Op, fn, col } = require("sequelize");

exports.getAllNumerosAvecAttribution = async (req, res) => {
  try {
    const { statut, client_id, multipleAttributions, numero_attribue } =
      req.query;

    // Préparer les conditions de filtrage pour les numéros
    const whereNumeroAttribue = {};
    if (statut) whereNumeroAttribue.statut = statut;
    if (numero_attribue) whereNumeroAttribue.numero_attribue = numero_attribue;

    // Préparer les conditions de filtrage pour les clients
    const whereClient = {};
    if (client_id) whereClient.id = client_id;

    // Filtrage pour les numéros ayant plusieurs attributions
    const havingMultipleAttributions =
      multipleAttributions === "true"
        ? {
            [Op.gt]: [fn("COUNT", col("AttributionNumeros.id")), 1] // On compte les attributions
          }
        : {};

    const numeros = await NumeroAttribue.findAll({
      where: {
        ...whereNumeroAttribue,
        statut: {
          [Op.in]: ["retiré", "résiliation"]
        }
      },
      include: [
        {
          model: AttributionNumero,
          include: [
            {
              model: AttributionDecision,
              limit: 1,
              order: [["created_at", "DESC"]]
            },
            {
              model: Client,
              required: !!client_id,
              where: whereClient
            }
          ],
          required: true
        }
      ],
      group: ["NumeroAttribue.id"],
      having: havingMultipleAttributions,
      order: [["created_at", "DESC"]]
    });

    return res.status(200).json({
      success: true,
      message: "Liste des numéros récupérée avec succès",
      numeros
    });
  } catch (error) {
    console.error("Erreur:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des numéros"
    });
  }
};

// ✅ Libérer un numéro attribué (mettre son statut à "libre")
exports.libererNumeroAttribue = async (req, res) => {
  try {
    const { id } = req.params;
    const numero = await NumeroAttribue.findByPk(id);

    if (!numero) {
      return res.json({ success: false, message: "Numéro non trouvé" });
    }

    if (numero.statut === "libre") {
      return res.json({ success: false, message: "Ce numéro est déjà libre" });
    }

    numero.statut = "libre";
    await numero.save();

    return res
      .status(200)
      .json({ success: true, message: "Numéro libéré avec succès" });
  } catch (error) {
    console.error(error);
    return res.json({
      success: false,
      message: "Erreur lors de la libération du numéro"
    });
  }
};
