const { Op } = require("sequelize");
const {
  NumeroAttribue,
  UssdAttribuer,
  AttributionNumero,
  USSDAttribution,
  Client,
  Service,
  Category,
  Pnn,
  Utilisation,
  USSD
} = require("../../models");

/**
 * Vérifie si les numéros sont disponibles, déjà attribués ou hors plage.
 */
async function checkNumeroDisponibilite(req, res) {
  const { numeros, serviceId, utilisationId, zoneId } = req.body;

  console.log("Numéros reçus pour vérification :", numeros);
  console.log("Filtres :", { serviceId, utilisationId, zoneId });

  if (!Array.isArray(numeros) || numeros.length === 0) {
    return res.json({
      success: false,
      message: "Le tableau des numéros est requis et doit être non vide."
    });
  }

  try {
    const allUtilisations = await Utilisation.findAll();
    const utilisationsMap = {};
    allUtilisations.forEach((u) => {
      utilisationsMap[u.id] = u.nom;
    });

    // Préparer les conditions de filtre
    const pnnFilter = {
      etat: true
    };
    if (serviceId) pnnFilter.service_id = serviceId;
    if (utilisationId) pnnFilter.utilisation_id = utilisationId;
    if (zoneId) pnnFilter.zone_utilisation_id = zoneId;

    const numeroFilter = {
      numero_attribue: { [Op.in]: numeros },
      statut: { [Op.ne]: "libre" }
    };

    // Récupérer les conflits avec filtres aussi si souhaité
    const numeroConflicts = await NumeroAttribue.findAll({
      where: numeroFilter,
      include: [
        {
          model: AttributionNumero,
          include: [
            Client,
            {
              model: Service,
              include: [Category]
            }
          ]
        },
        {
          model: Pnn,
          where: pnnFilter,
          required: false,
          include: [
            Utilisation,
            {
              model: Service,
              include: [Category]
            }
          ]
        }
      ]
    });

    // Récupérer les PNNs actifs filtrés
    const activePnns = await Pnn.findAll({
      where: pnnFilter,
      include: [
        Utilisation,
        {
          model: Service,
          include: [Category]
        }
      ]
    });

    const conflicts = [];
    const availableNumeros = [];
    const outOfRangeNumeros = [];

    // Conflits
    for (const entry of numeroConflicts) {
      const clientName = (
        entry.AttributionNumero?.Client?.denomination || "client inconnu"
      ).toUpperCase();

      let utilisationName = "Utilisation inconnue";
      if (entry.utilisation_id && utilisationsMap[entry.utilisation_id]) {
        utilisationName = utilisationsMap[entry.utilisation_id];
      } else if (entry.Pnn?.Utilisation?.nom) {
        utilisationName = entry.Pnn.Utilisation.nom;
      }

      const dateAttribution = entry.AttributionNumero?.date_attribution
        ? new Date(entry.AttributionNumero.date_attribution).toLocaleDateString(
            "fr-FR"
          )
        : "Date inconnue";

      const categoryId = entry.AttributionNumero?.Service?.Category?.id;
      let messagePrefix = "Le numéro";
      if (categoryId === 1) {
        messagePrefix = "Le bloc";
      }

      conflicts.push(
        `${messagePrefix} ${entry.numero_attribue} a déjà été attribué à ${clientName} (${utilisationName}) le ${dateAttribution}`
      );
    }

    // Vérification de chaque numéro
    for (const numero of numeros) {
      const numeroStr = String(numero);
      const numeroInt = parseInt(numero);

      if (isNaN(numeroInt)) {
        outOfRangeNumeros.push(
          `Le numéro "${numero}" n'est pas un nombre valide.`
        );
        continue;
      }

      const matchedPnn = activePnns.find(
        (pnn) => numeroInt >= pnn.bloc_min && numeroInt <= pnn.block_max
      );

      if (!matchedPnn) { 
        if (serviceId || utilisationId || zoneId) {
          outOfRangeNumeros.push(
            `Le numéro ${numero} n’est pas disponible pour le service sélectionné.`
          );
        } else {
          // Sinon, on accepte les USSD courts
          if (numeroStr.length >= 3 && numeroStr.length <= 4) {
            availableNumeros.push(
              `Le numéro ${numero} est disponible (USSD détecté)`
            );
          } else {
            outOfRangeNumeros.push(
              `Le numéro ${numero} ne fait pas partie d’un bloc PNN ou USSD valide.`
            );
          }
        }
        continue;
      }

      const isConflict = numeroConflicts.some(
        (entry) => String(entry.numero_attribue) === numeroStr
      );

      if (isConflict) continue;

      const categoryId = matchedPnn.Service?.Category?.id;
      let messagePrefix = "Le numéro";
      if (categoryId === 1) {
        messagePrefix = "Le bloc";
      }

      const utilisationNom =
        matchedPnn.Utilisation?.nom ||
        utilisationsMap[matchedPnn.utilisation_id] ||
        "Utilisation inconnue";

      availableNumeros.push(
        `${messagePrefix} ${numero} est disponible. (${utilisationNom})`
      );
    }

    return res.json({
      success: conflicts.length === 0 && outOfRangeNumeros.length === 0,
      message:
        conflicts.length > 0 || outOfRangeNumeros.length > 0
          ? "Des problèmes ont été trouvés."
          : "Tous les numéros sont valides et disponibles.",
      conflicts,
      outOfRangeNumeros,
      availableNumeros
    });
  } catch (error) {
    console.error("Erreur lors de la vérification des numéros :", error);
    return res.json({
      success: false,
      message: "Erreur lors de la vérification des numéros."
    });
  }
}

module.exports = { checkNumeroDisponibilite };
