const { Op } = require("sequelize");
const {
  AttributionNumero,
  Pnn,
  NumeroAttribue,
  Utilisation,
  AttributionDecision,
  Client
} = require("../models");

const getTotalAndRemainingNumbers = async (req, res) => {
  try {
    const utilisationId = req.params.utilisationId;
    const { startDate, endDate, mois, annee } = req.query;

    console.log("utilisationId:", utilisationId);
    console.log("startDate:", startDate);
    console.log("endDate:", endDate);
    console.log("mois:", mois);
    console.log("annee:", annee);

    const pnns = await Pnn.findAll({
      where: { utilisation_id: utilisationId },
      attributes: ["id", "bloc_min", "block_max"]
    });

    let start = null;
    let end = null;

    // Cas où startDate et endDate sont fournis
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({
          success: false,
          message: "Format de date invalide"
        });
      }
    } else if (annee && !mois) {
      // Si seulement l'année est fournie, on prend l'année entière (1er janvier - 31 décembre)
      const y = parseInt(annee);
      if (isNaN(y)) {
        return res.status(400).json({
          success: false,
          message: "Année invalide"
        });
      }
      start = new Date(y, 0, 1); // 1er janvier
      end = new Date(y, 11, 31); // 31 décembre
    } else if (annee && mois) {
      // Si l'année et le mois sont fournis, on prend le début et la fin du mois spécifié
      const m = parseInt(mois) - 1; // Mois 0-indexé
      const y = parseInt(annee);
      if (isNaN(m) || isNaN(y)) {
        return res.status(400).json({
          success: false,
          message: "Mois ou année invalide"
        });
      }
      start = new Date(y, m, 1); // 1er jour du mois
      end = new Date(y, m + 1, 0); // Dernier jour du mois
    } else if (mois && !annee) {
      // Si seulement le mois est fourni, on prend l'année actuelle et le mois spécifié
      const m = parseInt(mois) - 1; // Mois 0-indexé
      const y = new Date().getFullYear(); // Année actuelle
      if (isNaN(m)) {
        return res.status(400).json({
          success: false,
          message: "Mois invalide"
        });
      }
      start = new Date(y, m, 1); // 1er jour du mois actuel
      end = new Date(y, m + 1, 0); // Dernier jour du mois actuel
    }

    console.log("start:", start);
    console.log("end:", end);

    const numeroWhere = {
      statut: { [Op.in]: ["attribue"] }
    };

    if (start && end) {
      numeroWhere.date_attribution = {
        [Op.between]: [start, end]
      };
    }

    numeroWhere.utilisation_id = utilisationId;

    const numerosAttribues = await NumeroAttribue.findAll({
      where: numeroWhere
    });

    const allocatedCountMap = {};
    numerosAttribues.forEach((num) => {
      allocatedCountMap[num.pnn_id] = (allocatedCountMap[num.pnn_id] || 0) + 1;
    });

    let totalNumbers = 0;
    let allocatedNumbers = 0;
    const pnnRates = [];

    pnns.forEach((pnn) => {
      const count = pnn.block_max - pnn.bloc_min + 1;
      const allocated = allocatedCountMap[pnn.id] || 0;

      totalNumbers += count;
      allocatedNumbers += allocated;

      const occupancyRate = (allocated / count) * 100;

      pnnRates.push({
        pnn_id: pnn.id,
        total_numbers: count,
        allocated_numbers: allocated,
        occupancy_rate: occupancyRate.toFixed(2)
      });
    });

    const remainingNumbers = totalNumbers - allocatedNumbers;

    return res.json({
      success: true,
      data: {
        total_numbers: totalNumbers,
        allocated_numbers: allocatedNumbers,
        remaining_numbers: remainingNumbers,
        pnn_rates: pnnRates
      }
    });
  } catch (error) {
    console.error("Erreur :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
};

// Fonction pour récupérer les décisions associées aux attributions
const getAttributionDecisions = async (where) => {
  const decisions = await AttributionDecision.findAll({
    where,
    attributes: ["type_decision", "date_attribution"] // Utilisation de date_attribution au lieu de created_at
  });

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

  decisions.forEach((d) => {
    const type = d.type_decision?.toLowerCase();
    const date = new Date(d.date_attribution).toLocaleDateString(); // Utilisation de date_attribution pour récupérer la date

    if (decisionCount.hasOwnProperty(type)) {
      // Vérification de l'existence de la date dans le tableau et ajout du comptage
      const existingDate = decisionCount[type].find(
        (item) => item.date === date
      );
      if (existingDate) {
        existingDate.count++;
      } else {
        decisionCount[type].push({ date, count: 1 });
      }
    }
  });

  return decisionCount;
};

const getAttributionCoutDecisions = async (where) => {
  const decisions = await AttributionDecision.findAll({
    where,
    attributes: ["type_decision"]
  });

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

  decisions.forEach((d) => {
    const type = d.type_decision?.toLowerCase();

    if (decisionCount.hasOwnProperty(type)) {
      // Incrémenter simplement le compteur pour chaque type
      decisionCount[type]++;
    }
  });

  return decisionCount;
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
const getNumbers = async (attributionWhere) => {
  try {
    // Supposons que tu récupères les numéros dans un modèle `NumeroAttribue`
    const numbers = await NumeroAttribue.findAll({
      where: attributionWhere,
      attributes: ["id", "pnn_id", "statut", "utilisation_id"] // Ajuste les attributs selon tes besoins
    });

    return numbers;
  } catch (error) {
    console.error("Erreur lors de la récupération des numéros : ", error);
    throw error; // Rejette l'erreur pour qu'elle puisse être gérée par le code appelant
  }
};

const getAllTotalAndRemainingNumbers = async (req, res) => {
  try {
    const { startDate, endDate, mois, annee, type_decision } = req.query;

    const pnns = await Pnn.findAll({
      attributes: ["id", "bloc_min", "block_max", "utilisation_id"],
      include: [
        {
          model: Utilisation,
          attributes: ["id", "nom"]
        }
      ]
    });

    // === FILTRES ===
    const createdAtWhere = {}; // pour getNumbers
    const dateAttributionWhere = {}; // pour getAttributionDecisions

    // Filtrage par date : startDate / endDate
    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      // Vérifier que les dates sont valides
      if (isNaN(startDateObj) || isNaN(endDateObj)) {
        return res.status(400).json({
          success: false,
          message: "Format de date invalide"
        });
      }

      // Fixer l'heure à 00:00:00 pour les deux dates, juste pour être sûr
      startDateObj.setHours(0, 0, 0, 0);
      endDateObj.setHours(23, 59, 59, 999); // Mais ici, c'est simplement pour prendre jusqu'à la fin de la journée

      // Filtrer les données selon la plage de dates sans se soucier des heures
      createdAtWhere.date_attribution = {
        [Op.gte]: startDateObj, // "greater than or equal"
        [Op.lte]: endDateObj // "less than or equal"
      };

      dateAttributionWhere.date_attribution = {
        [Op.gte]: startDateObj,
        [Op.lte]: endDateObj
      };
    }

    // Filtrage par mois / année
    if (mois && annee) {
      const m = parseInt(mois) - 1;
      const y = parseInt(annee);

      const startOfMonth = new Date(y, m, 1);
      const endOfMonth = new Date(y, m + 1, 0);

      createdAtWhere.date_attribution = { [Op.between]: [startOfMonth, endOfMonth] };
      dateAttributionWhere.date_attribution = {
        [Op.between]: [startOfMonth, endOfMonth]
      };
    }

    // Filtrage uniquement par année
    if (!mois && annee) {
      const y = parseInt(annee);
      const startOfYear = new Date(y, 0, 1);
      const endOfYear = new Date(y + 1, 0, 0);

      createdAtWhere.date_attribution = { [Op.between]: [startOfYear, endOfYear] };
      dateAttributionWhere.date_attribution = {
        [Op.between]: [startOfYear, endOfYear]
      };
    } else if (mois && !annee) {
      // Filtrage par mois seul (année courante si non précisée)
      const currentYear = new Date().getFullYear();
      const m = parseInt(mois) - 1;
      const startOfMonth = new Date(currentYear, m, 1);
      const endOfMonth = new Date(currentYear, m + 1, 0);

      createdAtWhere.date_attribution = { [Op.between]: [startOfMonth, endOfMonth] };
      dateAttributionWhere.date_attribution = {
        [Op.between]: [startOfMonth, endOfMonth]
      };
    }

    // === APPELS AUX FONCTIONS ===
    const numbers = await getNumbers(createdAtWhere);
    const attributionsWithDecisions = await getAttributionDecisions(
      dateAttributionWhere
    );
    const attributionNumeroCount = await countAttributionNumero(
      dateAttributionWhere
    );
    const attributionDecisionCount = await getAttributionCoutDecisions(
      dateAttributionWhere
    );

    const allocatedCountMap = {};
    numbers.forEach((num) => {
      allocatedCountMap[num.pnn_id] = (allocatedCountMap[num.pnn_id] || 0) + 1;
    });

    const groupedByUtilisation = {};
    pnns.forEach((pnn) => {
      const utilisationId = pnn.utilisation_id;
      const utilisationName = pnn.Utilisation?.nom || "Non défini";

      if (!groupedByUtilisation[utilisationId]) {
        groupedByUtilisation[utilisationId] = {
          nom: utilisationName,
          pnns: []
        };
      }
      groupedByUtilisation[utilisationId].pnns.push(pnn);
    });

    let totalNumbers = 0;
    let allocatedNumbers = 0;
    const utilisationRates = [];
    const decisionCount = await getAttributionDecisions(dateAttributionWhere);

    Object.entries(groupedByUtilisation).forEach(([utilisation_id, group]) => {
      let groupTotalNumbers = 0;
      let groupAllocatedNumbers = 0;
      const groupPnnRates = [];

      group.pnns.forEach((pnn) => {
        const count = pnn.block_max - pnn.bloc_min + 1;
        const allocated = allocatedCountMap[pnn.id] || 0;

        groupTotalNumbers += count;
        groupAllocatedNumbers += allocated;

        const occupancyRate = (allocated / count) * 100;

        groupPnnRates.push({
          pnn_id: pnn.id,
          total_numbers: count,
          allocated_numbers: allocated,
          occupancy_rate: occupancyRate.toFixed(2),
          decision: getDecisionPertinente(
            pnn.NumeroAttribues
              ? pnn.NumeroAttribues.flatMap((num) => num.Decisions)
              : []
          )
        });
      });

      totalNumbers += groupTotalNumbers;
      allocatedNumbers += groupAllocatedNumbers;

      const groupOccupancyRate =
        (groupAllocatedNumbers / groupTotalNumbers) * 100;

      utilisationRates.push({
        utilisation_id,
        nom: group.nom,
        total_numbers: groupTotalNumbers,
        allocated_numbers: groupAllocatedNumbers,
        remaining_numbers: groupTotalNumbers - groupAllocatedNumbers,
        occupancy_rate: groupOccupancyRate.toFixed(2),
        pnn_rates: groupPnnRates
      });
    });

    const remainingNumbers = totalNumbers - allocatedNumbers;

    // === Bloc pour les clients ===
    const now = new Date();
    let startOfCurrentMonth,
      endOfCurrentMonth,
      startOfPreviousMonth,
      endOfPreviousMonth;

    if (mois && annee) {
      const m = parseInt(mois) - 1;
      const y = parseInt(annee);

      if (isNaN(m) || isNaN(y)) {
        return res
          .status(400)
          .json({ success: false, message: "Mois ou année invalide" });
      }

      startOfCurrentMonth = new Date(y, m, 1);
      endOfCurrentMonth = new Date(y, m + 1, 0);
      startOfPreviousMonth = new Date(y, m - 1, 1);
      endOfPreviousMonth = new Date(y, m, 0);
    } else if (mois && !annee) {
      const m = parseInt(mois) - 1;

      if (isNaN(m)) {
        return res
          .status(400)
          .json({ success: false, message: "Mois invalide" });
      }

      startOfCurrentMonth = new Date(now.getFullYear(), m, 1);
      endOfCurrentMonth = new Date(now.getFullYear(), m + 1, 0);
      startOfPreviousMonth = new Date(now.getFullYear(), m - 1, 1);
      endOfPreviousMonth = new Date(now.getFullYear(), m, 0);
    } else if (!mois && annee) {
      const y = parseInt(annee);

      if (isNaN(y)) {
        return res
          .status(400)
          .json({ success: false, message: "Année invalide" });
      }

      startOfCurrentMonth = new Date(y, 0, 1);
      endOfCurrentMonth = new Date(y + 1, 0, 0);
      startOfPreviousMonth = new Date(y - 1, 0, 1);
      endOfPreviousMonth = new Date(y, 0, 0);
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start) || isNaN(end)) {
        return res
          .status(400)
          .json({ success: false, message: "Format de date invalide" });
      }

      startOfCurrentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      endOfCurrentMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0);
      startOfPreviousMonth = new Date(
        start.getFullYear(),
        start.getMonth() - 1,
        1
      );
      endOfPreviousMonth = new Date(start.getFullYear(), start.getMonth(), 0);
    } else {
      startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    const currentMonthCount = await Client.count({
      where: {
        created_at: {
          [Op.between]: [startOfCurrentMonth, endOfCurrentMonth]
        }
      }
    });

    const previousMonthCount = await Client.count({
      where: {
        created_at: {
          [Op.between]: [startOfPreviousMonth, endOfPreviousMonth]
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
        decision_data: decisionCount, // Ajout des données pour le graphique
        attribution_numero: attributionNumeroCount,
        attribution_count: attributionDecisionCount,
        clients: {
          currentMonth: currentMonthCount,
          previousMonth: previousMonthCount,
          direction: clientGrowthDirection
        }
      }
    });
  } catch (error) {
    console.error("Error fetching all dashboard data:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getTotalAndRemainingNumbers,
  getAllTotalAndRemainingNumbers
};
