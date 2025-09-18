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
      message: "numéros est requis et doit être non vide."
    });
  }

  try {
    const allUtilisations = await Utilisation.findAll();
    const utilisationsMap = {};
    allUtilisations.forEach((u) => {
      utilisationsMap[u.id] = u.nom;
    });

    const pnnFilter = { etat: true };
    if (serviceId) pnnFilter.service_id = serviceId;
    if (utilisationId) pnnFilter.utilisation_id = utilisationId;
    if (zoneId) pnnFilter.zone_utilisation_id = zoneId;

    const numeroFilter = {
      numero_attribue: { [Op.in]: numeros },
      statut: { [Op.ne]: "libre" }
    };

    const numeroConflicts = await NumeroAttribue.findAll({
      where: numeroFilter,
      include: [
        {
          model: AttributionNumero,
          include: [Client, { model: Service, include: [Category] }]
        },
        {
          model: Pnn,
          where: pnnFilter,
          required: false,
          include: [Utilisation, { model: Service, include: [Category] }]
        }
      ]
    });

    const activePnns = await Pnn.findAll({
      where: pnnFilter,
      include: [Utilisation, { model: Service, include: [Category] }]
    });

    const conflicts = [];
    const availableNumeros = [];
    const outOfRangeNumeros = [];

    // Conflits détaillés
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
      const messagePrefix = categoryId === 1 ? "Le bloc" : "Le numéro";

      conflicts.push(
        `${messagePrefix} ${entry.numero_attribue} est déjà attribué pour ${clientName} (${utilisationName})`
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

      // Vérifier d'abord le conflit
      const isConflict = numeroConflicts.some(
        (entry) => String(entry.numero_attribue) === numeroStr
      );
      if (isConflict) {
        const clientName = (
          numeroConflicts.find((e) => String(e.numero_attribue) === numeroStr)
            ?.AttributionNumero?.Client?.denomination || "client inconnu"
        ).toUpperCase();
        // conflicts.push(
        //   `Le numéro ${numeroStr} a déjà été attribué à ${clientName}.`
        // );
        continue; // passe au numéro suivant
      }

      // Gestion USSD si utilisationId = 15
      if (parseInt(utilisationId) === 15) {
        const isUSSD = /^\d{3,4}$/.test(numeroStr);
        if (!isUSSD) {
          outOfRangeNumeros.push(
            `Le numéro ${numeroStr} n'est pas un code USSD valide (3 ou 4 chiffres).`
          );
          continue;
        }

        availableNumeros.push(
          `Le code ${numeroStr} est disponible pour le service USSD.`
        );
        continue;
      }

      // Vérification normale des blocs PNN
      const matchedPnn = activePnns.find(
        (pnn) => numeroInt >= pnn.bloc_min && numeroInt <= pnn.block_max
      );

      if (!matchedPnn) {
        const serviceChoisi =
          activePnns.length > 0 ? activePnns[0].Service?.nom : null;

        const filtreChoisi = serviceId || utilisationId;

        if (filtreChoisi && serviceChoisi) {
          // Cas filtre choisi → message hors plage + plages
          const plages = activePnns
            .map((pnn) => ({ min: pnn.bloc_min, max: pnn.block_max }))
            .sort((a, b) => a.min - b.min);

          let message = `Le numéro ${numero} est hors plage pour les ${serviceChoisi}.\n`;

          if (plages.length > 0) {
            message += "Pour ce service, les plages valides sont :\n";
            for (let i = 0; i < plages.length; i += 2) {
              const first = plages[i];
              const second = plages[i + 1];
              if (second) {
                message += `- ${first.min} → ${first.max}     |     ${second.min} → ${second.max}\n`;
              } else {
                message += `- ${first.min} → ${first.max}\n`;
              }
            }
          } else {
            message += "Aucune plage valide n'est définie pour ce service.";
          }

          outOfRangeNumeros.push(message.trim());
          continue;
        } else {
          // Aucun filtre choisi → vérifier si c'est un code USSD
          const isUSSD = /^\d{3,4}$/.test(numeroStr);

          if (!isUSSD) {
            outOfRangeNumeros.push(`Le numéro ${numeroStr} est hors plage.`);
          } else {
            availableNumeros.push(
              `Le code ${numeroStr} est disponible pour le service USSD.`
            );
          }
          continue;
        }
      }

      const categoryId = matchedPnn.Service?.Category?.id;
      const messagePrefix = categoryId === 1 ? "Le bloc" : "Le numéro";

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
