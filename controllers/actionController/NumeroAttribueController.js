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

exports.countAssignedInRange = async (req, res) => {
  try {
    const { bloc_min, bloc_max } = req.query;

    if (!bloc_min || !bloc_max) {
      return res.status(400).json({
        message: "Les paramètres bloc_min et bloc_max sont requis"
      });
    }

    const count = await NumeroAttribue.count({
      where: {
        numero_attribue: {
          [Op.between]: [bloc_min, bloc_max]
        },
        statut: {
          [Op.not]: "libre"
        },
        pnn_id: {
          [Op.and]: {
            [Op.ne]: null,
            [Op.ne]: ""
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      assignedCount: count
    });
  } catch (error) {
    console.error("Erreur lors du comptage des numéros dans la plage :", error);
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
};

exports.countAttributionGapByPnn = async (req, res) => {
  try {
    const { pnnId } = req.params;

    if (!pnnId) {
      return res.json({ success: false, message: "pnnId est requis" });
    }

    // 1. Nombre d'attributions pour le PNN sélectionné
    const selectedCount = await NumeroAttribue.count({
      where: {
        pnn_id: pnnId,
        statut: { [Op.not]: "libre" },
        numero_attribue: {
          [Op.and]: {
            [Op.ne]: null,
            [Op.ne]: ""
          }
        }
      }
    });

    // 2. Attributions pour tous les autres PNN
    const allCounts = await NumeroAttribue.findAll({
      attributes: [
        "pnn_id",
        [
          NumeroAttribue.sequelize.fn(
            "COUNT",
            NumeroAttribue.sequelize.col("id")
          ),
          "count"
        ]
      ],
      where: {
        pnn_id: { [Op.ne]: pnnId },
        statut: { [Op.not]: "libre" },
        numero_attribue: {
          [Op.and]: {
            [Op.ne]: null,
            [Op.ne]: ""
          }
        }
      },
      group: ["pnn_id"]
    });

    let hasGap = false;
    let details = [];

    // 3. Comparaison avec chaque autre PNN
    for (const item of allCounts) {
      const otherCount = parseInt(item.dataValues.count);
      const ecart = selectedCount - otherCount;

      if (ecart > 5) {
        hasGap = true;
        details.push({
          pnn_compare_id: item.pnn_id,
          ecart
        });
      }
    }

    return res.json({
      success: true,
      selectedPnnAttributionCount: selectedCount,
      hasGap,
      message: hasGap
        ? "Le PNN sélectionné dépasse certains autres PNN de plus de 5 attributions."
        : "Pas d'écart important détecté.",
      details // contient les pnn_id comparés et les écarts
    });
  } catch (error) {
    console.error("Erreur lors de la vérification d'écart entre PNN :", error);
    return res.json({ success: false, message: "Erreur interne du serveur" });
  }
};

// 1. Compter les USSD attribués par digit et prefixe
exports.countUssdAssignedByDigitAndPrefix = async (req, res) => {
  try {
    const { digit, prefix } = req.query;

    if (!digit || ![3, 4].includes(Number(digit))) {
      return res.status(400).json({
        message: "Le paramètre digit (3 ou 4) est requis"
      });
    }
    if (!prefix) {
      return res.status(400).json({
        message: "Le paramètre prefix est requis"
      });
    }

    // Générer la plage min et max pour ce prefix et digit
    const digitInt = Number(digit);
    const min = prefix.padEnd(digitInt, "0");
    const max = prefix.padEnd(digitInt, "9");

    const count = await NumeroAttribue.count({
      where: {
        numero_attribue: {
          [Op.between]: [min, max]
        },
        statut: { [Op.not]: "libre" },
        [Op.or]: [{ pnn_id: null }, { pnn_id: "" }],
        [Op.and]: [
          NumeroAttribue.sequelize.where(
            NumeroAttribue.sequelize.fn(
              "LENGTH",
              NumeroAttribue.sequelize.col("numero_attribue")
            ),
            digitInt
          )
        ]
      }
    });

    return res.status(200).json({
      success: true,
      assignedCount: count,
      plage: { min, max }
    });
  } catch (error) {
    console.error(
      "Erreur lors du comptage des USSD par digit et prefix :",
      error
    );
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
};

// 2. Vérifier le "gap" USSD par digit et prefix (1 chiffre)
exports.countUssdGapByDigitAndPrefix = async (req, res) => {
  try {
    const { digit } = req.query;
    if (!digit || ![3, 4].includes(Number(digit))) {
      return res.status(400).json({
        message: "Le paramètre digit (3 ou 4) est requis"
      });
    }

    const ussdCounts = await NumeroAttribue.findAll({
      attributes: [
        [
          NumeroAttribue.sequelize.fn(
            "LEFT",
            NumeroAttribue.sequelize.col("numero_attribue"),
            1
          ),
          "prefixe"
        ],
        [
          NumeroAttribue.sequelize.fn(
            "COUNT",
            NumeroAttribue.sequelize.col("id")
          ),
          "count"
        ]
      ],
      where: {
        statut: { [Op.not]: "libre" },
        [Op.or]: [{ pnn_id: null }, { pnn_id: "" }],
        [Op.and]: [
          NumeroAttribue.sequelize.where(
            NumeroAttribue.sequelize.fn(
              "LENGTH",
              NumeroAttribue.sequelize.col("numero_attribue")
            ),
            Number(digit)
          )
        ]
      },
      group: [
        NumeroAttribue.sequelize.fn(
          "LEFT",
          NumeroAttribue.sequelize.col("numero_attribue"),
          1
        )
      ]
    });

    let hasGap = false;
    let details = [];

    for (let i = 0; i < ussdCounts.length; i++) {
      for (let j = i + 1; j < ussdCounts.length; j++) {
        const a = ussdCounts[i].dataValues;
        const b = ussdCounts[j].dataValues;
        const ecart = Math.abs(a.count - b.count);
        if (ecart > 5) {
          hasGap = true;
          details.push({
            prefixeA: a.prefixe,
            countA: a.count,
            prefixeB: b.prefixe,
            countB: b.count,
            ecart
          });
        }
      }
    }

    return res.json({
      success: true,
      hasGap,
      message: hasGap
        ? "Un écart supérieur à 5 a été détecté entre certains groupes USSD (par prefixe et digit)."
        : "Pas d'écart important détecté.",
      details
    });
  } catch (error) {
    console.error(
      "Erreur lors de la vérification d'écart USSD par digit et prefixe :",
      error
    );
    return res
      .status(500)
      .json({ success: false, message: "Erreur interne du serveur" });
  }
};
