const {
  NumeroAttribue,
  AttributionNumero,
  AttributionDecision,
  Client
} = require("../../models");

const { Op, fn, col } = require("sequelize");

exports.getAllNumerosAvecAttribution = async (req, res) => {
  try {
    const { statut, client_id, multipleAttributions, numero_attribue } = req.query;

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
      where: whereNumeroAttribue,
      include: [
        {
          model: AttributionNumero,
          include: [
            {
              model: AttributionDecision,
              limit: 1, // On prend seulement la dernière décision
              order: [["created_at", "DESC"]] // On trie par date de création de la décision
            },
            {
              model: Client,
              required: client_id ? true : false, // Si client_id est présent, on exige cette jointure
              where: whereClient // Applique le filtre sur le client_id
            }
          ],
          required: true // Filtrage strict des AttributionNumeros
        }
      ],
      group: ["NumeroAttribue.id"],
      having: havingMultipleAttributions, // Applique le filtre sur le nombre d'attributions
      order: [["created_at", "DESC"]] // Trier par la date de création du numéro attribué
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
      return res
        .status(404)
        .json({ success: false, message: "Numéro non trouvé" });
    }

    if (numero.statut === "libre") {
      return res
        .status(400)
        .json({ success: false, message: "Ce numéro est déjà libre" });
    }

    numero.statut = "libre";
    await numero.save();

    return res
      .status(200)
      .json({ success: true, message: "Numéro libéré avec succès" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Erreur lors de la libération du numéro"
      });
  }
};
