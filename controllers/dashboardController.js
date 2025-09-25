const { Op, fn, col, literal } = require("sequelize");
const {
  AttributionNumero,
  Pnn,
  NumeroAttribue,
  Utilisation,
  UssdDecision,
  AttributionDecision,
  Client,
  USSD,
  UssdAttribuer,
  sequelize, // N'oublie pas d'importer sequelize ici
  TypeUtilisation
} = require("../models");

const getTotalAndRemainingNumbers = async (req, res) => {
  try {
    const utilisationId = parseInt(req.params.utilisationId);
    const { startDate, endDate, mois, annee } = req.query;

    const utilisation = await Utilisation.findByPk(utilisationId);
    if (!utilisation) {
      return res.json({ success: false, message: "Utilisation non trouvée" });
    }

    let start = null,
      end = null;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (annee && !mois) {
      const y = parseInt(annee);
      start = new Date(y, 0, 1);
      end = new Date(y, 11, 31, 23, 59, 59);
    } else if (annee && mois) {
      const y = parseInt(annee),
        m = parseInt(mois) - 1;
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0, 23, 59, 59);
    } else if (mois && !annee) {
      const y = new Date().getFullYear(),
        m = parseInt(mois) - 1;
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0, 23, 59, 59);
    }

    const pnns = await Pnn.findAll({
      where: { utilisation_id: utilisationId },
      attributes: [
        "id",
        "bloc_min",
        "block_max",
        "partition_prefix",
        "partition_prefix_b",
        "zone_utilisation_id",
        "partition_length"
      ]
    });

    const numeroWhere = {
      statut: { [Op.ne]: "libre" },
      utilisation_id: utilisationId
    };
    if (start && end)
      numeroWhere.date_attribution = { [Op.between]: [start, end] };

    const numerosAttribues = await NumeroAttribue.findAll({
      where: numeroWhere,
      attributes: ["pnn_id", "numero_attribue"],
      raw: true
    });

    const numerosByPnn = {};
    numerosAttribues.forEach((num) => {
      if (!numerosByPnn[num.pnn_id]) numerosByPnn[num.pnn_id] = [];
      numerosByPnn[num.pnn_id].push(parseInt(num.numero_attribue, 10));
    });

    let totalNumbers = 0,
      allocatedNumbers = 0;
    const pnnRates = [];
    const partitionsGlobal = {};

    if (utilisationId === 14) {
      const groupedByPrefix = pnns.reduce((acc, pnn) => {
        if (!acc[pnn.partition_prefix]) acc[pnn.partition_prefix] = [];
        acc[pnn.partition_prefix].push(pnn);
        return acc;
      }, {});

      for (const prefix in groupedByPrefix) {
        const pnnList = groupedByPrefix[prefix];
        const firstPnn = pnnList[0];

        // ✅ Total global basé sur partition_length (1 seul PNN par préfixe)
        const prefixLength = prefix.toString().length;
        const totalParPrefixe = firstPnn
          ? Math.pow(10, firstPnn.partition_length - prefixLength)
          : 0;

        let allocatedForPrefix = 0;

        pnnList.forEach((pnn) => {
          // ✅ Détail pnn_rates : bloc réel comme avant
          const totalBloc =
            pnn.bloc_min != null && pnn.block_max != null
              ? pnn.block_max - pnn.bloc_min + 1
              : 0;

          const allocatedList = numerosByPnn[pnn.id] || [];
          const allocated = allocatedList.length;
          allocatedForPrefix += allocated;

          const midPoint = Math.floor((pnn.block_max + pnn.bloc_min) / 2);
          const firstHalfAllocated = allocatedList.filter(
            (num) => num >= pnn.bloc_min && num <= midPoint
          ).length;
          const secondHalfAllocated = allocatedList.filter(
            (num) => num > midPoint && num <= pnn.block_max
          ).length;

          pnnRates.push({
            pnn_id: pnn.id,
            prefixA: pnn.partition_prefix,
            prefixB: pnn.partition_prefix_b,
            ZoneUtilisation: pnn.zone_utilisation_id,
            total_numbers: totalBloc, // 🔹 inchangé
            allocated_numbers: allocated,
            first_half_allocated: firstHalfAllocated,
            second_half_allocated: secondHalfAllocated,
            occupancy_rate:
              totalBloc > 0
                ? ((allocated / totalBloc) * 100).toFixed(2)
                : "0.00"
          });
        });

        // ✅ Global : 1 seul PNN par préfixe avec partition_length
        totalNumbers += totalParPrefixe;
        allocatedNumbers += allocatedForPrefix;

        partitionsGlobal[prefix] = {
          prefix,
          prefix_b_list: pnnList.map((p) => p.partition_prefix_b)
        };
      }
    } else {
      // Autres IDs : logique normale
      pnns.forEach((pnn) => {
        const totalBloc =
          pnn.bloc_min && pnn.block_max ? pnn.block_max - pnn.bloc_min + 1 : 0;
        totalNumbers += totalBloc;

        const allocatedList = numerosByPnn[pnn.id] || [];
        const allocated = allocatedList.length;
        allocatedNumbers += allocated;

        const midPoint = Math.floor((pnn.block_max + pnn.bloc_min) / 2);
        const firstHalfAllocated = allocatedList.filter(
          (num) => num >= pnn.bloc_min && num <= midPoint
        ).length;
        const secondHalfAllocated = allocatedList.filter(
          (num) => num > midPoint && num <= pnn.block_max
        ).length;

        pnnRates.push({
          pnn_id: pnn.id,
          prefixA: pnn.partition_prefix,
          prefixB: pnn.partition_prefix_b,
          ZoneUtilisation: pnn.zone_utilisation_id,
          total_numbers: totalBloc,
          allocated_numbers: allocated,
          first_half_allocated: firstHalfAllocated,
          second_half_allocated: secondHalfAllocated,
          occupancy_rate:
            totalBloc > 0 ? ((allocated / totalBloc) * 100).toFixed(2) : "0.00"
        });

        if (pnn.partition_prefix || pnn.partition_prefix_b) {
          partitionsGlobal[pnn.partition_prefix] = {
            prefix: pnn.partition_prefix,
            prefix_b_list: [pnn.partition_prefix_b]
          };
        }
      });
    }

    const remainingNumbers = totalNumbers - allocatedNumbers;

    const replacements = { utilisationId };
    if (start && end) (replacements.start = start), (replacements.end = end);
    const dateFilter =
      start && end ? "AND na.date_attribution BETWEEN :start AND :end" : "";

    const query = `
      SELECT combinaison_utilisations, COUNT(*) AS total
      FROM (
        SELECT na.id AS numero_id,
          GROUP_CONCAT(DISTINCT tu.libele_type ORDER BY tu.libele_type ASC SEPARATOR '+') AS combinaison_utilisations
        FROM NumeroAttribues na
        JOIN AttributionNumeros an ON an.id = na.attribution_id
        JOIN TypeUtilisationAttributionNumeros tjan ON tjan.attribution_numero_id = an.id
        JOIN TypeUtilisations tu ON tu.id = tjan.type_utilisation_id
        WHERE na.statut = 'attribue'
          AND an.utilisation_id = :utilisationId
          ${dateFilter}
        GROUP BY na.id
      ) AS combinaisons
      GROUP BY combinaison_utilisations
      ORDER BY total DESC;
    `;
    const [numerosParType] = await sequelize.query(query, { replacements });

    return res.json({
      success: true,
      data: {
        nom: utilisation.nom,
        total_numbers: totalNumbers,
        allocated_numbers: allocatedNumbers,
        remaining_numbers: remainingNumbers,
        pnn_rates: pnnRates,
        partitions: Object.values(partitionsGlobal),
        numeros_par_type_utilisation: numerosParType
      }
    });
  } catch (error) {
    console.error("Erreur :", error);
    return res.json({ success: false, message: "Erreur serveur" });
  }
};

const getTotalAndRemainingNumbersAction = async (req, res) => {
  try {
    const utilisationId = parseInt(req.params.utilisationId);
    const { startDate, endDate, mois, annee } = req.query;

    // 1️⃣ Vérification de l'existence de l'utilisation
    const utilisation = await Utilisation.findByPk(utilisationId);
    if (!utilisation) {
      return res.json({ success: false, message: "Utilisation non trouvée" });
    }

    // 2️⃣ Construction des bornes temporelles
    let start = null,
      end = null;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      if (isNaN(start) || isNaN(end)) {
        return res.json({ success: false, message: "Dates invalides" });
      }
    } else if (annee && !mois) {
      const y = parseInt(annee);
      start = new Date(y, 0, 1);
      end = new Date(y, 11, 31, 23, 59, 59);
    } else if (annee && mois) {
      const y = parseInt(annee),
        m = parseInt(mois) - 1;
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0, 23, 59, 59);
    } else if (mois && !annee) {
      const y = new Date().getFullYear(),
        m = parseInt(mois) - 1;
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0, 23, 59, 59);
    }

    // 3️⃣ Récupération des PNN liés à l'utilisation
    const pnns = await Pnn.findAll({
      where: { utilisation_id: utilisationId, etat: true },
      attributes: [
        "id",
        "bloc_min",
        "block_max",
        "partition_prefix",
        "partition_prefix_b",
        "zone_utilisation_id"
      ]
    });

    // 4️⃣ Préparation du filtre des numéros attribués
    const numeroWhere = {
      statut: { [Op.ne]: "libre" },
      utilisation_id: utilisationId
    };
    if (start && end) {
      numeroWhere.date_attribution = { [Op.between]: [start, end] };
    }

    // 5️⃣ Récupération de TOUS les numéros attribués pour calculs
    const numerosAttribues = await NumeroAttribue.findAll({
      where: numeroWhere,
      attributes: ["pnn_id", "numero_attribue"],
      raw: true
    });

    // Regrouper les numéros attribués par PNN
    const numerosByPnn = {};
    numerosAttribues.forEach((num) => {
      if (!numerosByPnn[num.pnn_id]) {
        numerosByPnn[num.pnn_id] = [];
      }
      numerosByPnn[num.pnn_id].push(parseInt(num.numero_attribue, 10));
    });

    // 6️⃣ Calcul des totaux
    let totalNumbers = 0,
      allocatedNumbers = 0;
    const pnnRates = [];

    pnns.forEach((pnn) => {
      const count =
        pnn.block_max && pnn.bloc_min ? pnn.block_max - pnn.bloc_min + 1 : 0;

      totalNumbers += count;

      const allocatedList = numerosByPnn[pnn.id] || [];
      const allocated = allocatedList.length;
      allocatedNumbers += allocated;

      const occupancyRate = count > 0 ? (allocated / count) * 100 : 0;

      // ✅ Calcul des moitiés
      const midPoint = Math.floor((pnn.block_max + pnn.bloc_min) / 2);

      const firstHalfAllocated = allocatedList.filter(
        (num) => num >= pnn.bloc_min && num <= midPoint
      ).length;

      const secondHalfAllocated = allocatedList.filter(
        (num) => num > midPoint && num <= pnn.block_max
      ).length;

      pnnRates.push({
        pnn_id: pnn.id,
        prefixA: pnn.partition_prefix,
        prefixB: pnn.partition_prefix_b,
        ZoneUtilisation: pnn.zone_utilisation_id,
        total_numbers: count,
        allocated_numbers: allocated,
        first_half_allocated: firstHalfAllocated, // ✅ Nombre attribué dans la 1ère moitié
        second_half_allocated: secondHalfAllocated, // ✅ Nombre attribué dans la 2ème moitié
        occupancy_rate: occupancyRate.toFixed(2)
      });
    });

    const remainingNumbers = totalNumbers - allocatedNumbers;

    // 7️⃣ Requête SQL pour combinaisons types d'utilisation
    const replacements = { utilisationId };
    if (start && end) {
      replacements.start = start;
      replacements.end = end;
    }

    const dateFilter =
      start && end ? "AND na.date_attribution BETWEEN :start AND :end" : "";

    const query = `
      SELECT combinaison_utilisations, COUNT(*) AS total
      FROM (
        SELECT na.id AS numero_id,
          GROUP_CONCAT(DISTINCT tu.libele_type ORDER BY tu.libele_type ASC SEPARATOR '+') AS combinaison_utilisations
        FROM NumeroAttribues na
        JOIN AttributionNumeros an ON an.id = na.attribution_id
        JOIN TypeUtilisationAttributionNumeros tjan ON tjan.attribution_numero_id = an.id
        JOIN TypeUtilisations tu ON tu.id = tjan.type_utilisation_id
        WHERE na.statut = 'attribue'
          AND an.utilisation_id = :utilisationId
          ${dateFilter}
        GROUP BY na.id
      ) AS combinaisons
      GROUP BY combinaison_utilisations
      ORDER BY total DESC;
    `;

    const [numerosParType] = await sequelize.query(query, { replacements });

    // 8️⃣ Réponse finale
    return res.json({
      success: true,
      data: {
        nom: utilisation.nom,
        total_numbers: totalNumbers,
        allocated_numbers: allocatedNumbers,
        remaining_numbers: remainingNumbers,
        pnn_rates: pnnRates, // ✅ Contient la répartition par moitié
        numeros_par_type_utilisation: numerosParType
      }
    });
  } catch (error) {
    console.error("Erreur :", error);
    return res.json({ success: false, message: "Erreur serveur" });
  }
};

const TableauRecap = async (req, res) => {
  try {
    const { startDate, endDate, mois, annee, utilisation_id } = req.query;

    let start = null;
    let end = null;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.json({ success: false, message: "Format de date invalide" });
      }
    } else if (annee && !mois) {
      const y = parseInt(annee);
      if (isNaN(y)) {
        return res.json({ success: false, message: "Année invalide" });
      }
      start = new Date(y, 0, 1);
      end = new Date(y, 11, 31, 23, 59, 59);
    } else if (annee && mois) {
      const m = parseInt(mois) - 1;
      const y = parseInt(annee);
      if (isNaN(y) || isNaN(m) || m < 0 || m > 11) {
        return res.json({ success: false, message: "Mois ou année invalide" });
      }
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0, 23, 59, 59);
    } else if (mois && !annee) {
      const m = parseInt(mois) - 1;
      const y = new Date().getFullYear();
      if (isNaN(m) || m < 0 || m > 11) {
        return res.json({ success: false, message: "Mois invalide" });
      }
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0, 23, 59, 59);
    }

    let previousYearStart = null;
    let previousYearEnd = null;
    if (start && end) {
      previousYearStart = new Date(start);
      previousYearStart.setFullYear(previousYearStart.getFullYear() - 1);
      previousYearEnd = new Date(end);
      previousYearEnd.setFullYear(previousYearEnd.getFullYear() - 1);
    }

    const whereAttribue = { statut: { [Op.ne]: "libre" } };
    if (start && end) {
      whereAttribue.date_attribution = { [Op.between]: [start, end] };
    }
    if (utilisation_id) {
      whereAttribue.utilisation_id = utilisation_id;
    }

    const wherePnn = {};
    if (utilisation_id) {
      wherePnn.utilisation_id = utilisation_id;
    }

    // Récupérer les PNN avec leurs numéros attribués
    const pnns = await Pnn.findAll({
      where: {
        ...wherePnn,
        partition_length: { [Op.ne]: null },
        bloc_min: { [Op.ne]: null },
        block_max: { [Op.ne]: null }
      },
      attributes: [
        "id",
        "bloc_min",
        "block_max",
        "partition_length",
        "utilisation_id",
        "partition_prefix",
        "partition_prefix_b"
      ],
      include: [
        {
          model: Utilisation,
          attributes: ["id", "nom"]
        },
        {
          model: NumeroAttribue,
          where: whereAttribue,
          required: false
        }
      ]
    });

    // PNN pour l'année précédente
    const pnnsAnneePrecedente = await Pnn.findAll({
      where: wherePnn,
      attributes: ["id", "bloc_min", "block_max"],
      include: [
        {
          model: NumeroAttribue,
          required: false,
          where:
            previousYearStart && previousYearEnd
              ? {
                  statut: { [Op.ne]: "libre" },
                  date_attribution: {
                    [Op.between]: [previousYearStart, previousYearEnd]
                  }
                }
              : {}
        }
      ]
    });

    const totalDisponibleAnneePrecedenteMap = {};
    pnnsAnneePrecedente.forEach((pnn) => {
      const blocMin = pnn.bloc_min || 0;
      const blocMax = pnn.block_max || 0;
      const total = blocMax >= blocMin ? blocMax - blocMin + 1 : 0;
      const attribues = pnn.NumeroAttribues?.length || 0;
      totalDisponibleAnneePrecedenteMap[pnn.id] = total - attribues;
    });

    const totalDisponibleAnneePrecedente = Object.values(
      totalDisponibleAnneePrecedenteMap
    ).reduce((sum, val) => sum + val, 0);

    let totalNumbers = 0;
    let allocatedNumbers = 0;
    const utilisationMap = {};

    pnns.forEach((pnn) => {
      const blocMin = pnn.bloc_min || 0;
      const blocMax = pnn.block_max || 0;
      const totalInBloc = blocMax >= blocMin ? blocMax - blocMin + 1 : 0;

      // Filtrer uniquement les numéros attribués qui ont le même utilisation_id que le PNN
      const allocatedNumbersList =
        pnn.NumeroAttribues?.filter(
          (num) =>
            num.statut !== "libre" && num.utilisation_id === pnn.utilisation_id
        ) || [];

      const allocated = allocatedNumbersList.length;

      const numeroAttribueList = allocatedNumbersList.map(
        (num) => num.numero_attribue || num.id
      );

      console.log(`PNN ID: ${pnn.id}, Bloc: [${blocMin}-${blocMax}]`);
      console.log("Numéros attribués :", numeroAttribueList);
      console.log(`Total attribués dans ce PNN: ${allocated}\n`);

      totalNumbers += totalInBloc;
      allocatedNumbers += allocated;

      const utilisationId = pnn.Utilisation?.id || 0;
      const utilisationName = pnn.Utilisation?.nom || "Inconnu";

      const key =
        utilisationId === 12
          ? `${utilisationId}||${utilisationName}||pnn_${pnn.id}`
          : `${utilisationId}||${utilisationName}`;

      if (!utilisationMap[key]) utilisationMap[key] = [];

      utilisationMap[key].push({
        pnn_id: pnn.id,
        bloc_min: blocMin,
        block_max: blocMax,
        partition_prefix: pnn.partition_prefix,
        partition_length: pnn.partition_length,
        partition_prefix_b: pnn.partition_prefix_b,
        total_numbers: totalInBloc,
        allocated_numbers: allocated,
        numero_attribue_list: numeroAttribueList,
        total_disponible_annee_precedente:
          totalDisponibleAnneePrecedenteMap[pnn.id] || 0,
        total_ressource_restante: totalInBloc - allocated,
        occupancy_rate:
          totalInBloc > 0
            ? ((allocated / totalInBloc) * 100).toFixed(2)
            : "0.00"
      });
    });

    const utilisationSummary = Object.entries(utilisationMap).map(
      ([key, pnns]) => {
        const [utilisationId, utilisationName] = key.split("||");
        const totalAttribues = pnns.reduce(
          (sum, pnn) => sum + pnn.allocated_numbers,
          0
        );
        return {
          utilisation_id: parseInt(utilisationId),
          utilisation: utilisationName,
          total_attribues: totalAttribues,
          pnns
        };
      }
    );

    return res.json({
      success: true,
      data: {
        total_numbers: totalNumbers,
        allocated_numbers: allocatedNumbers,
        remaining_numbers: totalNumbers - allocatedNumbers,
        utilisation_summary: utilisationSummary,
        total_disponible_annee_precedente: totalDisponibleAnneePrecedente
      }
    });
  } catch (error) {
    console.error("Erreur TableauRecap :", error);
    return res.json({ success: false, message: "Erreur serveur" });
  }
};

// Fonction pour récupérer les décisions associées aux attributions
const getAttributionDecisions = async (where = {}) => {
  // Appliquer un filtre par défaut sur l'année en cours si pas de filtre date_attribution
  if (!where.date_attribution) {
    const currentYear = new Date().getFullYear();
    where.date_attribution = {
      [Op.gte]: new Date(`${currentYear}-01-01`),
      [Op.lte]: new Date(`${currentYear}-12-31`)
    };
  }

  // Récupérer les décisions d'attribution
  const decisions = await AttributionDecision.findAll({
    where,
    attributes: ["type_decision", "date_attribution"]
  });

  // Fusionner les décisions d'attribution et USSD
  const allDecisions = decisions;

  const decisionCount = {
    modification: [],
    reclamation: [],
    suspension: [],
    attribution: [],
    retrait: [],
    reservation: [],
    renouvellement: [],
    résiliation: []
  };

  // Parcours de toutes les décisions pour les compter par type et date
  allDecisions.forEach((d) => {
    const type = d.type_decision?.toLowerCase();
    const date = new Date(d.date_attribution).toLocaleDateString(); // Ex: "24/04/2025"

    if (decisionCount.hasOwnProperty(type)) {
      const existing = decisionCount[type].find((item) => item.date === date);
      if (existing) {
        existing.count++;
      } else {
        decisionCount[type].push({ date, count: 1 });
      }
    }
  });

  return decisionCount;
};

const getAttributionCoutDecisions = async (where) => {
  // Requêtes vers les deux tables
  const attribDecisions = await AttributionDecision.findAll({
    where,
    attributes: ["type_decision"]
  });

  // Structure de comptage initialisée
  const decisionCount = {
    modification: 0,
    reclamation: 0,
    suspension: 0,
    attribution: 0,
    retrait: 0,
    reservation: 0,
    renouvellement: 0,
    résiliation: 0
  };

  // Fusion des deux tableaux
  const allDecisions = attribDecisions;

  // Comptage
  allDecisions.forEach((d) => {
    const type = d.type_decision?.toLowerCase();
    if (decisionCount.hasOwnProperty(type)) {
      decisionCount[type]++;
    }
  });

  return decisionCount;
};

const getDecisionsByYear = async () => {
  // Récupérer toutes les décisions d'attribution sans filtrage spécifique
  const attribDecisions = await AttributionDecision.findAll({
    attributes: ["type_decision", "date_attribution"]
  });

  // Objet pour stocker le comptage des décisions par année
  const decisionCountByYear = {};

  attribDecisions.forEach((d) => {
    const type = d.type_decision?.toLowerCase();
    const date = new Date(d.date_attribution);
    const year = date.getFullYear(); // Ex: 2025

    // Initialiser la structure pour l'année si elle n'existe pas
    if (!decisionCountByYear[year]) {
      decisionCountByYear[year] = {
        modification: 0,
        reclamation: 0,
        suspension: 0,
        attribution: 0,
        retrait: 0,
        reservation: 0,
        renouvellement: 0,
        résiliation: 0
      };
    }

    // Si le type de décision existe, incrémenter le count pour cette année
    if (decisionCountByYear[year].hasOwnProperty(type)) {
      decisionCountByYear[year][type]++;
    }
  });

  // Retourner les décisions regroupées par année
  return decisionCountByYear;
};

const countAttributionNumero = async (where = {}) => {
  try {
    const totalAttributions = await AttributionNumero.count({ where });
    return totalAttributions;
  } catch (error) {
    console.error("Erreur lors du comptage des AttributionNumero :", error);
    throw error;
  }
};

// Fonction pour déterminer la décision pertinente
const getDecisionPertinente = (decisions) => {
  if (!decisions || decisions.length === 0) return null;

  // Trier les décisions par date de création décroissante
  const sorted = [...decisions].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  // 1. Résiliation (si présente)
  const resiliation = sorted.find((d) => d.type_decision === "résiliation");
  if (resiliation) return resiliation;

  // 2. Retrait
  const retrait = sorted.find((d) => d.type_decision === "retrait");
  if (retrait) return retrait;

  // 3. Suspension active
  const suspension = sorted.find((d) => d.type_decision === "suspension");
  if (
    suspension?.date_expiration &&
    new Date() < new Date(suspension.date_expiration)
  ) {
    return suspension;
  }

  // 4. La plus récente entre modification et réclamation
  const modifOrRecla = sorted.find(
    (d) =>
      d.type_decision === "modification" || d.type_decision === "reclamation"
  );
  if (modifOrRecla) return modifOrRecla;

  // 5. Renouvellement
  const renouvellement = sorted.find(
    (d) => d.type_decision === "renouvellement"
  );
  if (renouvellement) return renouvellement;

  // 6. Attribution (par défaut)
  return sorted.find((d) => d.type_decision === "attribution") || sorted[0];
};

// Exemple d'une fonction pour récupérer les numéros
const getNumbers = async (attributionWhere = {}) => {
  try {
    if (Object.keys(attributionWhere).length === 0) {
      console.log("Aucun critère spécifié. Filtrage par défaut appliqué.");
    }

    const whereClause = {
      ...attributionWhere,
      statut: { [Op.ne]: "libre" } // Exclure les statuts "libre"
    };

    const numerosAttribuesPNN = await NumeroAttribue.findAll({
      where: whereClause,
      attributes: ["id", "pnn_id", "statut", "utilisation_id"]
    });

    if (!numerosAttribuesPNN || numerosAttribuesPNN.length === 0) {
      console.warn("Aucun numéro trouvé pour les critères spécifiés.");
    }

    return numerosAttribuesPNN;
  } catch (error) {
    console.error("Erreur lors de la récupération des numéros :", error);
    throw new Error(
      `Erreur lors de la récupération des numéros avec les critères ${JSON.stringify(
        attributionWhere
      )} : ${error.message}`
    );
  }
};

// const getAllTotalAndRemainingNumbers = async (req, res) => {
//   try {
//     const { startDate, endDate, mois, annee, type_decision } = req.query;

//     const pnns = await Pnn.findAll({
//       attributes: [
//         "id",
//         "bloc_min",
//         "partition_prefix_b",
//         "partition_prefix",
//         "block_max",
//         "utilisation_id"
//       ],
//       include: [
//         {
//           model: Utilisation,
//           attributes: ["id", "nom"]
//         }
//       ]
//     });

//     const allEntities = pnns;
//     // === FILTRES ===
//     const createdAtWhere = {}; // pour getNumbers
//     const dateAttributionWhere = {}; // pour getAttributionDecisions

//     // Filtrage par date : startDate / endDate
//     if (startDate && endDate) {
//       const startDateObj = new Date(startDate);
//       const endDateObj = new Date(endDate);

//       // Vérifier que les dates sont valides
//       if (isNaN(startDateObj) || isNaN(endDateObj)) {
//         return res.json({
//           success: false,
//           message: "Format de date invalide"
//         });
//       }

//       // Fixer l'heure à 00:00:00 pour les deux dates, juste pour être sûr
//       startDateObj.setHours(0, 0, 0, 0);
//       endDateObj.setHours(23, 59, 59, 999); // Mais ici, c'est simplement pour prendre jusqu'à la fin de la journée

//       // Filtrer les données selon la plage de dates sans se soucier des heures
//       createdAtWhere.date_attribution = {
//         [Op.gte]: startDateObj, // "greater than or equal"
//         [Op.lte]: endDateObj // "less than or equal"
//       };

//       dateAttributionWhere.date_attribution = {
//         [Op.gte]: startDateObj,
//         [Op.lte]: endDateObj
//       };
//     }

//     // Filtrage par mois / année
//     if (mois && annee) {
//       const m = parseInt(mois) - 1;
//       const y = parseInt(annee);

//       const startOfMonth = new Date(y, m, 1);
//       const endOfMonth = new Date(y, m + 1, 0);

//       createdAtWhere.date_attribution = {
//         [Op.between]: [startOfMonth, endOfMonth]
//       };
//       dateAttributionWhere.date_attribution = {
//         [Op.between]: [startOfMonth, endOfMonth]
//       };
//     }

//     // Filtrage uniquement par année
//     if (!mois && annee) {
//       const y = parseInt(annee);
//       const startOfYear = new Date(y, 0, 1);
//       const endOfYear = new Date(y + 1, 0, 0);

//       createdAtWhere.date_attribution = {
//         [Op.between]: [startOfYear, endOfYear]
//       };
//       dateAttributionWhere.date_attribution = {
//         [Op.between]: [startOfYear, endOfYear]
//       };
//     } else if (mois && !annee) {
//       // Filtrage par mois seul (année courante si non précisée)
//       const currentYear = new Date().getFullYear();
//       const m = parseInt(mois) - 1;
//       const startOfMonth = new Date(currentYear, m, 1);
//       const endOfMonth = new Date(currentYear, m + 1, 0);

//       createdAtWhere.date_attribution = {
//         [Op.between]: [startOfMonth, endOfMonth]
//       };
//       dateAttributionWhere.date_attribution = {
//         [Op.between]: [startOfMonth, endOfMonth]
//       };
//     }

//     // === APPELS AUX FONCTIONS ===
//     const numbers = await getNumbers(createdAtWhere);
//     const attributionsWithDecisions = await getAttributionDecisions(
//       dateAttributionWhere
//     );
//     const attributionNumeroCount = await countAttributionNumero(
//       dateAttributionWhere
//     );
//     const attributionDecisionCount = await getAttributionCoutDecisions(
//       dateAttributionWhere
//     );

//     const decisionCount = await getAttributionDecisions(dateAttributionWhere);
//     const decisionyears = await getDecisionsByYear();

//     // const allocatedCountMap = {};
//     // numbers.forEach((num) => {
//     //   allocatedCountMap[num.pnn_id] = (allocatedCountMap[num.pnn_id] || 0) + 1;
//     // });

//     const groupedByUtilisation = {};

//     // Regrouper les entités par utilisation
//     allEntities.forEach((entity) => {
//       const utilisationId = entity.utilisation_id;
//       const utilisationName = entity.Utilisation?.nom || "Non défini";

//       if (!groupedByUtilisation[utilisationId]) {
//         groupedByUtilisation[utilisationId] = {
//           nom: utilisationName,
//           entities: []
//         };
//       }
//       groupedByUtilisation[utilisationId].entities.push(entity);
//     });

//     // Organiser les numéros attribués en fonction des entités
//     const allocatedCountMap = {}; // On doit initialiser cette variable ici pour l'utiliser dans le reste du calcul
//     numbers.forEach((num) => {
//       if (num.pnn_id) {
//         allocatedCountMap[num.pnn_id] =
//           (allocatedCountMap[num.pnn_id] || 0) + 1;
//       }
//       if (num.ussd_id) {
//         allocatedCountMap[num.ussd_id] =
//           (allocatedCountMap[num.ussd_id] || 0) + 1;
//       }
//     });

//     let totalNumbers = 0;
//     let allocatedNumbers = 0;
//     const utilisationRates = [];

//     // Parcourir les groupes d'entités pour calculer les statistiques
//     Object.entries(groupedByUtilisation).forEach(([utilisation_id, group]) => {
//       let groupTotalNumbers = 0;
//       let groupAllocatedNumbers = 0;
//       const groupEntityRates = [];
//       const groupPartitions = [];

//       group.entities.forEach((entity) => {
//         const blocMin = entity.bloc_min;
//         const blocMax = entity.block_max || entity.block_max;

//         const count =
//           blocMin && blocMax && blocMin <= blocMax ? blocMax - blocMin + 1 : 0;

//         // ✅ Nouveau filtrage par utilisation
//         const allocatedNumbersList = numbers.filter(
//           (num) =>
//             num.pnn_id === entity.id &&
//             num.statut !== "libre" &&
//             num.utilisation_id === entity.utilisation_id
//         );

//         const allocated = allocatedNumbersList.length;

//         groupTotalNumbers += count;
//         groupAllocatedNumbers += allocated;

//         const occupancyRate = count > 0 ? (allocated / count) * 100 : 0;

//         // Décisions uniquement depuis PNN
//         const numerosNonLibres =
//           entity.NumeroAttribues?.filter((num) => num.statut !== "libre") || [];
//         const decisions = numerosNonLibres.flatMap(
//           (num) => num.Decisions || []
//         );

//         // Récupération des partitions directement dans entity
//         const partitions = [];
//         if (entity.partition_prefix || entity.partition_prefix_b) {
//           partitions.push({
//             prefix: entity.partition_prefix,
//             prefix_b: entity.partition_prefix_b
//           });
//         }

//         groupPartitions.push(...partitions);

//         groupEntityRates.push({
//           entity_id: entity.id,
//           total_numbers: count,
//           allocated_numbers: allocated,
//           occupancy_rate: occupancyRate.toFixed(2),
//           decision: getDecisionPertinente(decisions),
//           partitions
//         });
//       });

//       totalNumbers += groupTotalNumbers;
//       allocatedNumbers += groupAllocatedNumbers;

//       const groupOccupancyRate =
//         groupTotalNumbers > 0
//           ? (groupAllocatedNumbers / groupTotalNumbers) * 100
//           : 0;

//       utilisationRates.push({
//         utilisation_id,
//         nom: group.nom,
//         total_numbers: groupTotalNumbers,
//         allocated_numbers: groupAllocatedNumbers,
//         remaining_numbers: groupTotalNumbers - groupAllocatedNumbers,
//         occupancy_rate: groupOccupancyRate.toFixed(2),
//         entity_rates: groupEntityRates,
//         partitions: groupPartitions
//       });
//     });

//     const remainingNumbers = totalNumbers - allocatedNumbers;

//     // === Bloc pour les clients ===
//     const now = new Date();
//     let startOfCurrentMonth,
//       endOfCurrentMonth,
//       startOfPreviousMonth,
//       endOfPreviousMonth;

//     // Convertir les dates éventuelles si fournies dans la requête
//     const m = mois ? parseInt(mois) - 1 : null;
//     const y = annee ? parseInt(annee) : null;

//     if (mois && annee) {
//       if (isNaN(m) || isNaN(y)) {
//         return res.json({ success: false, message: "Mois ou année invalide" });
//       }

//       startOfCurrentMonth = new Date(y, m, 1);
//       endOfCurrentMonth = new Date(y, m + 1, 1); // exclusif
//       startOfPreviousMonth = new Date(y, m - 1, 1);
//       endOfPreviousMonth = new Date(y, m, 1); // exclusif
//     } else if (mois && !annee) {
//       if (isNaN(m)) {
//         return res.json({ success: false, message: "Mois invalide" });
//       }

//       const year = now.getFullYear();
//       startOfCurrentMonth = new Date(year, m, 1);
//       endOfCurrentMonth = new Date(year, m + 1, 1);
//       startOfPreviousMonth = new Date(year, m - 1, 1);
//       endOfPreviousMonth = new Date(year, m, 1);
//     } else if (!mois && annee) {
//       if (isNaN(y)) {
//         return res.json({ success: false, message: "Année invalide" });
//       }

//       startOfCurrentMonth = new Date(y, 0, 1);
//       endOfCurrentMonth = new Date(y + 1, 0, 1);
//       startOfPreviousMonth = new Date(y - 1, 0, 1);
//       endOfPreviousMonth = new Date(y, 0, 1);
//     } else if (startDate && endDate) {
//       const start = new Date(startDate);
//       const end = new Date(endDate);

//       if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//         return res.json({ success: false, message: "Format de date invalide" });
//       }

//       startOfCurrentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
//       endOfCurrentMonth = new Date(end.getFullYear(), end.getMonth() + 1, 1);
//       startOfPreviousMonth = new Date(
//         start.getFullYear(),
//         start.getMonth() - 1,
//         1
//       );
//       endOfPreviousMonth = new Date(start.getFullYear(), start.getMonth(), 1);
//     } else {
//       startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//       endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
//       startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
//       endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     }

//     const currentMonthCount = await Client.count({
//       where: {
//         created_at: {
//           [Op.gte]: startOfCurrentMonth,
//           [Op.lt]: endOfCurrentMonth
//         }
//       }
//     });

//     const previousMonthCount = await Client.count({
//       where: {
//         created_at: {
//           [Op.gte]: startOfPreviousMonth,
//           [Op.lt]: endOfPreviousMonth
//         }
//       }
//     });

//     let clientGrowthDirection = "equal";
//     if (currentMonthCount > previousMonthCount) clientGrowthDirection = "up";
//     else if (currentMonthCount < previousMonthCount)
//       clientGrowthDirection = "down";

//     return res.json({
//       success: true,
//       data: {
//         total_numbers: totalNumbers,
//         allocated_numbers: allocatedNumbers,
//         remaining_numbers: remainingNumbers,
//         utilisation_rates: utilisationRates,
//         decision_data: decisionCount, // Ajout des données pour le graphique
//         attribution_numero: attributionNumeroCount,
//         attribution_count: attributionDecisionCount,
//         yearsdecision: decisionyears,
//         clients: {
//           currentMonth: currentMonthCount,
//           previousMonth: previousMonthCount,
//           direction: clientGrowthDirection
//         }
//       }
//     });
//   } catch (error) {
//     console.error("Error fetching all dashboard data:", error);
//     return res.json({ success: false, message: "Server error" });
//   }
// };

const getAllTotalAndRemainingNumbers = async (req, res) => {
  try {
    const { startDate, endDate, mois, annee, type_decision } = req.query;

    const pnns = await Pnn.findAll({
      attributes: [
        "id",
        "bloc_min",
        "partition_prefix_b",
        "partition_prefix",
        "block_max",
        "utilisation_id",
        "partition_length" // important pour le calcul
      ],
      include: [
        {
          model: Utilisation,
          attributes: ["id", "nom"]
        }
      ]
    });

    const allEntities = pnns;

    // === FILTRES ===
    const createdAtWhere = {};
    const dateAttributionWhere = {};

    // Filtrage par date
    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      if (isNaN(startDateObj) || isNaN(endDateObj))
        return res.json({ success: false, message: "Format de date invalide" });

      startDateObj.setHours(0, 0, 0, 0);
      endDateObj.setHours(23, 59, 59, 999);

      createdAtWhere.date_attribution = {
        [Op.gte]: startDateObj,
        [Op.lte]: endDateObj
      };
      dateAttributionWhere.date_attribution = {
        [Op.gte]: startDateObj,
        [Op.lte]: endDateObj
      };
    }

    // Filtrage par mois/année
    if (mois && annee) {
      const m = parseInt(mois) - 1;
      const y = parseInt(annee);
      const startOfMonth = new Date(y, m, 1);
      const endOfMonth = new Date(y, m + 1, 0);
      createdAtWhere.date_attribution = {
        [Op.between]: [startOfMonth, endOfMonth]
      };
      dateAttributionWhere.date_attribution = {
        [Op.between]: [startOfMonth, endOfMonth]
      };
    }

    // Filtrage uniquement par année
    if (!mois && annee) {
      const y = parseInt(annee);
      const startOfYear = new Date(y, 0, 1);
      const endOfYear = new Date(y + 1, 0, 0);
      createdAtWhere.date_attribution = {
        [Op.between]: [startOfYear, endOfYear]
      };
      dateAttributionWhere.date_attribution = {
        [Op.between]: [startOfYear, endOfYear]
      };
    } else if (mois && !annee) {
      const currentYear = new Date().getFullYear();
      const m = parseInt(mois) - 1;
      const startOfMonth = new Date(currentYear, m, 1);
      const endOfMonth = new Date(currentYear, m + 1, 0);
      createdAtWhere.date_attribution = {
        [Op.between]: [startOfMonth, endOfMonth]
      };
      dateAttributionWhere.date_attribution = {
        [Op.between]: [startOfMonth, endOfMonth]
      };
    }

    // === APPELS AUX FONCTIONS ===
    const numbers = await getNumbers(createdAtWhere);
    const attributionNumeroCount = await countAttributionNumero(
      dateAttributionWhere
    );
    const attributionDecisionCount = await getAttributionCoutDecisions(
      dateAttributionWhere
    );
    const decisionCount = await getAttributionDecisions(dateAttributionWhere);
    const decisionyears = await getDecisionsByYear();

    // --- Regroupement par utilisation ---
    const groupedByUtilisation = {};
    allEntities.forEach((entity) => {
      const utilisationId = entity.utilisation_id;
      const utilisationName = entity.Utilisation?.nom || "Non défini";
      if (!groupedByUtilisation[utilisationId]) {
        groupedByUtilisation[utilisationId] = {
          nom: utilisationName,
          entities: []
        };
      }
      groupedByUtilisation[utilisationId].entities.push(entity);
    });

    // --- Préparer allocatedCountMap ---
    const allocatedCountMap = {};
    numbers.forEach((num) => {
      if (num.pnn_id)
        allocatedCountMap[num.pnn_id] =
          (allocatedCountMap[num.pnn_id] || 0) + 1;
      if (num.ussd_id)
        allocatedCountMap[num.ussd_id] =
          (allocatedCountMap[num.ussd_id] || 0) + 1;
    });

    // --- Fonctions utilitaires pour calcul réel ---
    const formatNumber = (utilisationId) => {
      if (utilisationId === 1) return [2];
      if (utilisationId === 3) return [4];
      if (utilisationId === 4) return [3, 4];
      if (utilisationId === 14) return [8];
      if (utilisationId === 10) return [8];
      if (utilisationId === 11) return [4];
      if (utilisationId === 12) return [8];
      return [0];
    };

    const calculerRessourceReelle = (
      partitionLength,
      totalBloc,
      utilisationId,
      length
    ) => {
      const targetLength = length ?? Math.max(...formatNumber(utilisationId));
      const digitsManquants = targetLength - partitionLength;
      if (digitsManquants < 0) return totalBloc;
      return totalBloc * Math.pow(10, digitsManquants);
    };

    // --- Calcul des statistiques ---
    let totalNumbers = 0;
    let allocatedNumbers = 0;
    const utilisationRates = [];

    Object.entries(groupedByUtilisation).forEach(([utilisation_id, group]) => {
      let groupTotalNumbers = 0;
      let groupAllocatedNumbers = 0;
      const groupEntityRates = [];
      const groupPartitions = [];

      const multiplicateurs = {
        12: 100000,
        14: 10000
      };

      if (utilisation_id === "14") {
        // ID 14 : regrouper par préfixe
        const uniquePrefixes = [
          ...new Set(group.entities.map((e) => e.partition_prefix))
        ];

        uniquePrefixes.forEach((prefix) => {
          const entitiesForPrefix = group.entities.filter(
            (e) => e.partition_prefix === prefix
          );

          // Total théorique par préfixe pour utilisation global
          const totalNumbersForPrefix = 10000000;
          groupTotalNumbers += totalNumbersForPrefix;

          entitiesForPrefix.forEach((entity) => {
            const blocMin = entity.bloc_min;
            const blocMax = entity.block_max || entity.block_max;
            const totalBloc =
              blocMin && blocMax && blocMin <= blocMax
                ? blocMax - blocMin + 1
                : 0;

            const allocatedNumbersList = numbers.filter(
              (num) =>
                (num.pnn_id === entity.id || num.ussd_id === entity.id) &&
                num.statut !== "libre" &&
                num.utilisation_id === entity.utilisation_id
            );

            const allocated = allocatedNumbersList.length;

            // **Multiplication appliquée ici pour l'entité**
            const allocatedWithMultiplier =
              allocated * multiplicateurs[entity.utilisation_id];

            groupAllocatedNumbers += allocatedWithMultiplier;

            groupEntityRates.push({
              entity_id: entity.id,
              total_numbers: totalNumbersForPrefix, // on prend le total théorique global pour le préfixe
              allocated_numbers: allocatedWithMultiplier,
              occupancy_rate:
                totalNumbersForPrefix > 0
                  ? (
                      (allocatedWithMultiplier / totalNumbersForPrefix) *
                      100
                    ).toFixed(2)
                  : "0.00",
              partitions: [
                {
                  prefix: entity.partition_prefix,
                  prefix_b: entity.partition_prefix_b
                }
              ]
            });
          });

          // Stocker partitions globales
          const prefix_b_list = entitiesForPrefix.map(
            (e) => e.partition_prefix_b
          );
          groupPartitions.push({ prefix, prefix_b_list });
        });
      } else {
        // Logique normale pour les autres IDs
        group.entities.forEach((entity) => {
          const blocMin = entity.bloc_min;
          const blocMax = entity.block_max || entity.block_max;
          const totalBloc =
            blocMin && blocMax && blocMin <= blocMax
              ? blocMax - blocMin + 1
              : 0;

          formatNumber(entity.utilisation_id).forEach((length) => {
            const totalNumbersForLength = calculerRessourceReelle(
              entity.partition_length,
              totalBloc,
              entity.utilisation_id,
              length
            );

            const allocatedNumbersList = numbers.filter(
              (num) =>
                (num.pnn_id === entity.id || num.ussd_id === entity.id) &&
                num.statut !== "libre" &&
                num.utilisation_id === entity.utilisation_id &&
                (!num.numero || num.numero.length === length)
            );

            const allocated =
              allocatedNumbersList.length *
              (multiplicateurs[entity.utilisation_id] || 1);

            groupTotalNumbers += totalNumbersForLength;
            groupAllocatedNumbers += allocated;

            groupEntityRates.push({
              entity_id: entity.id,
              total_numbers: totalNumbersForLength,
              allocated_numbers: allocated,
              occupancy_rate:
                totalNumbersForLength > 0
                  ? ((allocated / totalNumbersForLength) * 100).toFixed(2)
                  : "0.00",
              partitions: [
                {
                  prefix: entity.partition_prefix,
                  prefix_b: entity.partition_prefix_b
                }
              ]
            });
          });

          if (entity.partition_prefix || entity.partition_prefix_b) {
            groupPartitions.push({
              prefix: entity.partition_prefix,
              prefix_b: entity.partition_prefix_b
            });
          }
        });
      }

      totalNumbers += groupTotalNumbers;
      allocatedNumbers += groupAllocatedNumbers;

      utilisationRates.push({
        utilisation_id,
        nom: group.nom,
        total_numbers: groupTotalNumbers,
        allocated_numbers: groupAllocatedNumbers,
        remaining_numbers: groupTotalNumbers - groupAllocatedNumbers,
        occupancy_rate:
          groupTotalNumbers > 0
            ? ((groupAllocatedNumbers / groupTotalNumbers) * 100).toFixed(2)
            : "0.00",
        entity_rates: groupEntityRates,
        partitions: groupPartitions
      });
    });

    const remainingNumbers = totalNumbers - allocatedNumbers;

    // --- Bloc clients (inchangé) ---
    const now = new Date();
    let startOfCurrentMonth,
      endOfCurrentMonth,
      startOfPreviousMonth,
      endOfPreviousMonth;
    const m = mois ? parseInt(mois) - 1 : null;
    const y = annee ? parseInt(annee) : null;

    if (mois && annee) {
      startOfCurrentMonth = new Date(y, m, 1);
      endOfCurrentMonth = new Date(y, m + 1, 1);
      startOfPreviousMonth = new Date(y, m - 1, 1);
      endOfPreviousMonth = new Date(y, m, 1);
    } else if (mois && !annee) {
      const year = now.getFullYear();
      startOfCurrentMonth = new Date(year, m, 1);
      endOfCurrentMonth = new Date(year, m + 1, 1);
      startOfPreviousMonth = new Date(year, m - 1, 1);
      endOfPreviousMonth = new Date(year, m, 1);
    } else if (!mois && annee) {
      startOfCurrentMonth = new Date(y, 0, 1);
      endOfCurrentMonth = new Date(y + 1, 0, 1);
      startOfPreviousMonth = new Date(y - 1, 0, 1);
      endOfPreviousMonth = new Date(y, 0, 1);
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      startOfCurrentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      endOfCurrentMonth = new Date(end.getFullYear(), end.getMonth() + 1, 1);
      startOfPreviousMonth = new Date(
        start.getFullYear(),
        start.getMonth() - 1,
        1
      );
      endOfPreviousMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    } else {
      startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const currentMonthCount = await Client.count({
      where: {
        created_at: {
          [Op.gte]: startOfCurrentMonth,
          [Op.lt]: endOfCurrentMonth
        }
      }
    });
    const previousMonthCount = await Client.count({
      where: {
        created_at: {
          [Op.gte]: startOfPreviousMonth,
          [Op.lt]: endOfPreviousMonth
        }
      }
    });

    let clientGrowthDirection = "equal";
    if (currentMonthCount > previousMonthCount) clientGrowthDirection = "up";
    else if (currentMonthCount < previousMonthCount)
      clientGrowthDirection = "down";

    return res.json({
      success: true,
      data: {
        total_numbers: totalNumbers,
        allocated_numbers: allocatedNumbers,
        remaining_numbers: remainingNumbers,
        utilisation_rates: utilisationRates,
        decision_data: decisionCount,
        attribution_numero: attributionNumeroCount,
        attribution_count: attributionDecisionCount,
        yearsdecision: decisionyears,
        clients: {
          currentMonth: currentMonthCount,
          previousMonth: previousMonthCount,
          direction: clientGrowthDirection
        }
      }
    });
  } catch (error) {
    console.error("Error fetching all dashboard data:", error);
    return res.json({ success: false, message: "Server error" });
  }
};

const getHistoriqueAttributionsParUtilisation = async (req, res) => {
  try {
    const utilisationsCibles = [12, 14];

    const pnns = await Pnn.findAll({
      where: {
        utilisation_id: { [Op.in]: utilisationsCibles },
        partition_length: { [Op.ne]: null },
        bloc_min: { [Op.ne]: null },
        block_max: { [Op.ne]: null }
      },
      include: [
        {
          model: Utilisation,
          attributes: ["id", "nom"]
        },
        {
          model: NumeroAttribue,
          required: true,
          attributes: ["date_attribution", "statut"],
          where: {
            statut: {
              [Op.ne]: "libre"
            }
          },
          include: [
            {
              model: AttributionNumero,
              attributes: ["client_id"],
              include: [
                {
                  model: Client,
                  attributes: ["id", "denomination"]
                }
              ]
            }
          ]
        }
      ]
    });

    const resultats = {};

    pnns.forEach((pnn) => {
      const utilisationId = pnn.utilisation_id;
      const utilisationNom = pnn.Utilisation?.nom || "Inconnu";
      const prefix = String(pnn.partition_prefix);

      if (!resultats[utilisationId]) {
        resultats[utilisationId] = {
          utilisation_id: utilisationId,
          utilisation: utilisationNom,
          regroupement: {}
        };
      }

      if (!resultats[utilisationId].regroupement[prefix]) {
        resultats[utilisationId].regroupement[prefix] = {
          prefix,
          total_theorique: 0,
          total_attributions: 0,
          historique: {}
        };
      }

      if (utilisationId === 11) {
        console.log(
          "PNN:",
          pnn.partition_prefix,
          "Numéro attribué:",
          attribue.id
        );
      }

      const blocSize = pnn.block_max - pnn.bloc_min + 1;
      const cibleLongueur = 8;
      const digitsManquants = cibleLongueur - (pnn.partition_length || 0);
      const facteur = Math.pow(10, digitsManquants);

      let totalReel;

      if (utilisationId === 14 && prefix === "2") {
        totalReel = 10_000_000;
      } else {
        totalReel = blocSize * facteur;
      }

      resultats[utilisationId].regroupement[prefix].total_theorique +=
        totalReel;

      pnn.NumeroAttribues.forEach((attribue) => {
        const date = new Date(attribue.date_attribution);
        const annee = date.getFullYear();
        const clientId = attribue.AttributionNumero?.Client?.id;
        const clientNom = (
          attribue.AttributionNumero?.Client?.denomination || "Inconnu"
        ).toUpperCase();

        if (!resultats[utilisationId].regroupement[prefix].historique[annee]) {
          resultats[utilisationId].regroupement[prefix].historique[annee] = {
            total_attributions: 0,
            par_operateur: {}
          };
        }

        // Total général (inclus même id 42)
        resultats[utilisationId].regroupement[prefix].historique[
          annee
        ].total_attributions += 1;
        resultats[utilisationId].regroupement[prefix].total_attributions += 1;

        // Exclusion opérateur id 42 pour par_operateur
        if (clientId !== 42) {
          if (
            !resultats[utilisationId].regroupement[prefix].historique[annee]
              .par_operateur[clientNom]
          ) {
            resultats[utilisationId].regroupement[prefix].historique[
              annee
            ].par_operateur[clientNom] = 0;
          }
          resultats[utilisationId].regroupement[prefix].historique[
            annee
          ].par_operateur[clientNom] += 1;
        }
      });
    });

    // Format final
    const data = Object.values(resultats).map((item) => ({
      utilisation_id: item.utilisation_id,
      utilisation: item.utilisation,
      regroupements: Object.values(item.regroupement)
    }));

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Erreur getHistoriqueAttributionsParUtilisation:", error);
    return res.json({
      success: false,
      message: "Erreur serveur"
    });
  }
};

const getHistoriqueSVA = async (req, res) => {
  try {
    const utilisationsCibles = [10, 11];

    // On fait un findAll avec groupements et comptage sur NumeroAttribue
    const resultatsBruts = await NumeroAttribue.findAll({
      attributes: [
        [fn("YEAR", col("date_attribution")), "annee"],
        [col("Pnn.utilisation_id"), "utilisation_id"],
        [col("Pnn.partition_prefix"), "prefix"],
        [fn("COUNT", col("NumeroAttribue.id")), "total_attributions"]
      ],
      where: {
        statut: { [Op.ne]: "libre" },
        date_attribution: { [Op.ne]: null } // ❌ Ignore ceux qui n'ont pas de date
      },
      include: [
        {
          model: Pnn,
          attributes: [],
          where: {
            utilisation_id: { [Op.in]: utilisationsCibles }
          },
          include: [
            {
              model: Utilisation,
              attributes: ["nom"]
            }
          ]
        }
      ],
      group: ["utilisation_id", "prefix", "annee", "Pnn.Utilisation.nom"],
      order: [
        [col("utilisation_id"), "ASC"],
        [col("prefix"), "ASC"],
        [literal("annee"), "ASC"]
      ],
      raw: true,
      nest: true
    });

    // Regroupement des résultats par utilisation et prefix
    const resultats = {};

    for (const row of resultatsBruts) {
      const utilisationId = row.utilisation_id;
      const utilisationNom = row.Pnn.Utilisation.nom || "Inconnu";
      const prefix = String(row.prefix);
      const annee = row.annee;
      const total = parseInt(row.total_attributions, 10);

      if (!resultats[utilisationId]) {
        resultats[utilisationId] = {
          utilisation_id: utilisationId,
          utilisation: utilisationNom,
          regroupement: {}
        };
      }
      if (!resultats[utilisationId].regroupement[prefix]) {
        resultats[utilisationId].regroupement[prefix] = {
          prefix,
          total_attributions: 0,
          historique: {}
        };
      }

      resultats[utilisationId].regroupement[prefix].historique[annee] = {
        total_attributions: total
      };
      resultats[utilisationId].regroupement[prefix].total_attributions += total;
    }

    const data = Object.values(resultats).map((item) => ({
      utilisation_id: item.utilisation_id,
      utilisation: item.utilisation,
      regroupements: Object.values(item.regroupement)
    }));

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Erreur getHistoriqueSVA:", error);
    return res.json({
      success: false,
      message: "Erreur serveur"
    });
  }
};

module.exports = {
  getTotalAndRemainingNumbers,
  getAllTotalAndRemainingNumbers,
  TableauRecap,
  getHistoriqueAttributionsParUtilisation,
  getHistoriqueSVA,
  getTotalAndRemainingNumbersAction
};
