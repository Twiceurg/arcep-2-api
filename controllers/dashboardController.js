const { Op } = require("sequelize");
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
    const utilisationId = req.params.utilisationId;
    const { startDate, endDate, mois, annee } = req.query;

    console.log("utilisationId:", utilisationId);
    console.log("startDate:", startDate);
    console.log("endDate:", endDate);
    console.log("mois:", mois);
    console.log("annee:", annee);

    // Vérification de l'existence de l'utilisation
    const utilisation = await Utilisation.findByPk(utilisationId);
    if (!utilisation) {
      return res
        .status(404)
        .json({ success: false, message: "Utilisation non trouvée" });
    }

    // Récupération des blocs PNN liés à cette utilisation
    const pnns = await Pnn.findAll({
      where: { utilisation_id: utilisationId },
      attributes: ["id", "bloc_min", "block_max"]
    });

    let start = null;
    let end = null;

    // 🎯 Gestion des différentes options de date
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      if (isNaN(start) || isNaN(end)) {
        return res
          .status(400)
          .json({ success: false, message: "Format de date invalide" });
      }
    } else if (annee && !mois) {
      const y = parseInt(annee);
      if (isNaN(y)) {
        return res
          .status(400)
          .json({ success: false, message: "Année invalide" });
      }
      start = new Date(y, 0, 1);
      end = new Date(y, 11, 31, 23, 59, 59);
    } else if (annee && mois) {
      const m = parseInt(mois) - 1;
      const y = parseInt(annee);
      if (isNaN(m) || isNaN(y)) {
        return res
          .status(400)
          .json({ success: false, message: "Mois ou année invalide" });
      }
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0, 23, 59, 59);
    } else if (mois && !annee) {
      const m = parseInt(mois) - 1;
      const y = new Date().getFullYear();
      if (isNaN(m)) {
        return res
          .status(400)
          .json({ success: false, message: "Mois invalide" });
      }
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0, 23, 59, 59);
    }

    // 📦 Préparation de la clause where pour NumeroAttribue
    const numeroWhere = {
      statut: "attribue",
      utilisation_id: utilisationId
    };

    if (start && end) {
      numeroWhere.date_attribution = {
        [Op.between]: [start, end]
      };
    }

    // 🔢 Récupération des numéros attribués
    const numerosAttribuesPNN = await NumeroAttribue.findAll({
      where: numeroWhere
    });

    // 🧮 Création d’une map pour compter les numéros attribués par PNN
    const allocatedCountMap = {};
    numerosAttribuesPNN.forEach((num) => {
      allocatedCountMap[num.pnn_id] = (allocatedCountMap[num.pnn_id] || 0) + 1;
    });

    // 📊 Calcul des statistiques globales
    let totalNumbers = 0;
    let allocatedNumbers = 0;
    const pnnRates = [];

    pnns.forEach((pnn) => {
      const count =
        pnn.bloc_min && pnn.block_max ? pnn.block_max - pnn.bloc_min + 1 : 0;
      const allocated = allocatedCountMap[pnn.id] || 0;
      totalNumbers += count;
      allocatedNumbers += allocated;

      const occupancyRate = count > 0 ? (allocated / count) * 100 : 0;

      pnnRates.push({
        bloc_id: pnn.id,
        total_numbers: count,
        allocated_numbers: allocated,
        occupancy_rate: occupancyRate.toFixed(2)
      });
    });

    const remainingNumbers = totalNumbers - allocatedNumbers;

    // 📥 Requête SQL brute pour grouper les numéros attribués par type d'utilisation
    const replacements = {
      utilisationId,
      ...(start && end ? { start, end } : {})
    };

    const dateFilter =
      start && end ? `AND na.date_attribution BETWEEN :start AND :end` : "";

    const query = `
      SELECT 
        tu.id AS type_utilisation_id,
        tu.libele_type AS nom_type,
        COUNT(na.id) AS total_numeros
      FROM \`NumeroAttribues\` na
      JOIN \`AttributionNumeros\` an ON an.id = na.attribution_id
      JOIN \`TypeUtilisations\` tu ON tu.id = an.type_utilisation_id
      WHERE na.statut = 'attribue'
        AND an.utilisation_id = :utilisationId
        ${dateFilter}
      GROUP BY tu.id, tu.libele_type
      ORDER BY total_numeros DESC
    `;

    const [numerosParType] = await sequelize.query(query, { replacements });

    // ✅ Réponse finale
    return res.json({
      success: true,
      data: {
        nom: utilisation.nom,
        total_numbers: totalNumbers,
        allocated_numbers: allocatedNumbers,
        remaining_numbers: remainingNumbers,
        pnn_rates: pnnRates,
        numeros_par_type_utilisation: numerosParType
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

    // Récupération des numéros attribués via NumeroAttribue
    const numerosAttribuesPNN = await NumeroAttribue.findAll({
      where: attributionWhere,
      attributes: ["id", "pnn_id", "statut", "utilisation_id"]
    });

    const allNumbers = numerosAttribuesPNN;

    if (allNumbers.length === 0) {
      console.warn("Aucun numéro trouvé pour les critères spécifiés.");
    }

    return allNumbers;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des numéros :",
      error.message
    );
    throw new Error(
      `Erreur lors de la récupération des numéros avec les critères ${JSON.stringify(
        attributionWhere
      )} : ${error.message}`
    );
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

    const allEntities = pnns;
    // === FILTRES ===
    const createdAtWhere = {}; // pour getNumbers
    const dateAttributionWhere = {}; // pour getAttributionDecisions

    // Filtrage par date : startDate / endDate
    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      // Vérifier que les dates sont valides
      if (isNaN(startDateObj) || isNaN(endDateObj)) {
        return res.json({
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
      // Filtrage par mois seul (année courante si non précisée)
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
    const attributionsWithDecisions = await getAttributionDecisions(
      dateAttributionWhere
    );
    const attributionNumeroCount = await countAttributionNumero(
      dateAttributionWhere
    );
    const attributionDecisionCount = await getAttributionCoutDecisions(
      dateAttributionWhere
    );

    const decisionCount = await getAttributionDecisions(dateAttributionWhere);
    const decisionyears = await getDecisionsByYear();

    // const allocatedCountMap = {};
    // numbers.forEach((num) => {
    //   allocatedCountMap[num.pnn_id] = (allocatedCountMap[num.pnn_id] || 0) + 1;
    // });

    const groupedByUtilisation = {};

    // Regrouper les entités par utilisation
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

    // Organiser les numéros attribués en fonction des entités
    const allocatedCountMap = {}; // On doit initialiser cette variable ici pour l'utiliser dans le reste du calcul
    numbers.forEach((num) => {
      if (num.pnn_id) {
        allocatedCountMap[num.pnn_id] =
          (allocatedCountMap[num.pnn_id] || 0) + 1;
      }
      if (num.ussd_id) {
        allocatedCountMap[num.ussd_id] =
          (allocatedCountMap[num.ussd_id] || 0) + 1;
      }
    });

    let totalNumbers = 0;
    let allocatedNumbers = 0;
    const utilisationRates = [];

    // Parcourir les groupes d'entités pour calculer les statistiques
    Object.entries(groupedByUtilisation).forEach(([utilisation_id, group]) => {
      let groupTotalNumbers = 0;
      let groupAllocatedNumbers = 0;
      const groupEntityRates = [];

      group.entities.forEach((entity) => {
        // Vérification des valeurs de bloc avant de calculer le total des numéros
        const blocMin = entity.bloc_min;
        const blocMax = entity.block_max || entity.bloc_max; // 'block_max' pour PNN, 'bloc_max' pour USSD

        // Calcul du nombre de numéros dans la plage
        const count =
          blocMin && blocMax && blocMin <= blocMax ? blocMax - blocMin + 1 : 0; // Si l'une des valeurs est invalide, on met 0 comme valeur

        // Comptabilisation des numéros attribués
        const allocated = allocatedCountMap[entity.id] || 0;

        groupTotalNumbers += count;
        groupAllocatedNumbers += allocated;

        const occupancyRate = count > 0 ? (allocated / count) * 100 : 0;

        // Traitement spécifique pour PNN
        if (entity.NumeroAttribues) {
          groupEntityRates.push({
            entity_id: entity.id,
            total_numbers: count,
            allocated_numbers: allocated,
            occupancy_rate: occupancyRate.toFixed(2),
            decision: getDecisionPertinente(
              entity.NumeroAttribues
                ? entity.NumeroAttribues.flatMap((num) => num.Decisions)
                : []
            )
          });
        }

        // Traitement spécifique pour USSD
        if (entity.UssdAttribuer) {
          groupEntityRates.push({
            entity_id: entity.id,
            total_numbers: count,
            allocated_numbers: allocated,
            occupancy_rate: occupancyRate.toFixed(2),
            decision: getDecisionPertinente(
              entity.UssdAttribuer
                ? entity.UssdAttribuer.flatMap((num) => num.Decisions)
                : []
            )
          });
        }
      });

      totalNumbers += groupTotalNumbers;
      allocatedNumbers += groupAllocatedNumbers;

      const groupOccupancyRate =
        groupTotalNumbers > 0
          ? (groupAllocatedNumbers / groupTotalNumbers) * 100
          : 0;

      utilisationRates.push({
        utilisation_id,
        nom: group.nom,
        total_numbers: groupTotalNumbers,
        allocated_numbers: groupAllocatedNumbers,
        remaining_numbers: groupTotalNumbers - groupAllocatedNumbers,
        occupancy_rate: groupOccupancyRate.toFixed(2),
        entity_rates: groupEntityRates
      });
    });

    const remainingNumbers = totalNumbers - allocatedNumbers;

    // === Bloc pour les clients ===
    const now = new Date();
    let startOfCurrentMonth,
      endOfCurrentMonth,
      startOfPreviousMonth,
      endOfPreviousMonth;

    // Convertir les dates éventuelles si fournies dans la requête
    const m = mois ? parseInt(mois) - 1 : null;
    const y = annee ? parseInt(annee) : null;

    if (mois && annee) {
      if (isNaN(m) || isNaN(y)) {
        return res
          .status(400)
          .json({ success: false, message: "Mois ou année invalide" });
      }

      startOfCurrentMonth = new Date(y, m, 1);
      endOfCurrentMonth = new Date(y, m + 1, 1); // exclusif
      startOfPreviousMonth = new Date(y, m - 1, 1);
      endOfPreviousMonth = new Date(y, m, 1); // exclusif
    } else if (mois && !annee) {
      if (isNaN(m)) {
        return res
          .status(400)
          .json({ success: false, message: "Mois invalide" });
      }

      const year = now.getFullYear();
      startOfCurrentMonth = new Date(year, m, 1);
      endOfCurrentMonth = new Date(year, m + 1, 1);
      startOfPreviousMonth = new Date(year, m - 1, 1);
      endOfPreviousMonth = new Date(year, m, 1);
    } else if (!mois && annee) {
      if (isNaN(y)) {
        return res.json({ success: false, message: "Année invalide" });
      }

      startOfCurrentMonth = new Date(y, 0, 1);
      endOfCurrentMonth = new Date(y + 1, 0, 1);
      startOfPreviousMonth = new Date(y - 1, 0, 1);
      endOfPreviousMonth = new Date(y, 0, 1);
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.json({ success: false, message: "Format de date invalide" });
      }

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
        decision_data: decisionCount, // Ajout des données pour le graphique
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

module.exports = {
  getTotalAndRemainingNumbers,
  getAllTotalAndRemainingNumbers
};
