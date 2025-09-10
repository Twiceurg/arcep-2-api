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
          activePnns.length > 0 ? activePnns[0].Service?.nom : null; // pas de service choisi

        let message;

        // Vérifier si au moins un filtre est choisi
        const filtreChoisi = serviceId || utilisationId;

        if (filtreChoisi && serviceChoisi) {
          // Cas où un service/utilisation est sélectionné : afficher le service + plages
          const plages = activePnns
            .map((pnn) => ({ min: pnn.bloc_min, max: pnn.block_max }))
            .sort((a, b) => a.min - b.min);

          message = `Le numéro ${numero} est hors plage pour les  ${serviceChoisi} .\n`;

          // Ajouter les plages seulement si elles existent
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
        } else {
          // Aucun service/utilisation choisi : message simple
          message = `Le numéro ${numero} est hors plage.`;
        }

        outOfRangeNumeros.push(message.trim());
        continue;
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

// async function checkNumeroDisponibilite(req, res) {
//   const { numeros, serviceId, utilisationId, zoneId } = req.body;

//   if (!Array.isArray(numeros) || numeros.length === 0) {
//     return res.json({
//       success: false,
//       message: "Le tableau des numéros est requis et doit être non vide."
//     });
//   }

//   try {
//     // 1) Normalisation des inputs
//     const rawNumeros = [
//       ...new Set(numeros.map((n) => String(n).trim()).filter(Boolean))
//     ];
//     const pureDigitNumeros = rawNumeros.filter((n) => /^\d+$/.test(n));
//     const numericNumeros = pureDigitNumeros.map((n) => Number(n));

//     // 2) Dictionnaire des utilisations
//     const allUtilisations = await Utilisation.findAll();
//     const utilisationsMap = Object.fromEntries(
//       allUtilisations.map((u) => [u.id, u.nom])
//     );

//     // 3) Filtres PNN
//     const pnnFilter = { etat: true };
//     if (serviceId) pnnFilter.service_id = serviceId;
//     if (utilisationId) pnnFilter.utilisation_id = utilisationId;
//     if (zoneId) pnnFilter.zone_utilisation_id = zoneId;

//     // 4) Conflits
//     const numeroFilter = {
//       numero_attribue: { [Op.in]: [...rawNumeros, ...numericNumeros] },
//       statut: { [Op.ne]: "libre" }
//     };

//     const numeroConflicts = await NumeroAttribue.findAll({
//       where: numeroFilter,
//       include: [
//         {
//           model: AttributionNumero,
//           include: [Client, { model: Service, include: [Category] }]
//         },
//         {
//           model: Pnn,
//           required: !!(serviceId || utilisationId || zoneId),
//           where: serviceId || utilisationId || zoneId ? pnnFilter : undefined,
//           include: [Utilisation, { model: Service, include: [Category] }]
//         }
//       ]
//     });

//     const conflictSet = new Set(
//       numeroConflicts.flatMap((e) => {
//         const v = e.numero_attribue;
//         const arr = [String(v)];
//         if (/^\d+$/.test(v)) arr.push(Number(v));
//         return arr;
//       })
//     );

//     // 5) PNN actifs (sauf USSD)
//     let activePnns = [];
//     if (parseInt(utilisationId) !== 15) {
//       activePnns = await Pnn.findAll({
//         where: pnnFilter,
//         include: [Utilisation, { model: Service, include: [Category] }]
//       });
//     }

//     const conflicts = [];
//     const availableNumeros = [];
//     const outOfRangeNumeros = [];

//     // Conflits détaillés
//     for (const entry of numeroConflicts) {
//       const clientName = (
//         entry.AttributionNumero?.Client?.denomination || "client inconnu"
//       ).toUpperCase();

//       let utilisationName = "Utilisation inconnue";
//       if (entry.AttributionNumero?.utilisation_id && utilisationsMap[entry.AttributionNumero.utilisation_id]) {
//         utilisationName = utilisationsMap[entry.AttributionNumero.utilisation_id];
//       } else if (entry.Pnn?.utilisation_id && utilisationsMap[entry.Pnn.utilisation_id]) {
//         utilisationName = utilisationsMap[entry.Pnn.utilisation_id];
//       }

//       const dateAttribution = entry.AttributionNumero?.date_attribution
//         ? new Date(entry.AttributionNumero.date_attribution).toLocaleDateString("fr-FR")
//         : "Date inconnue";

//       const catFromAttrib = entry.AttributionNumero?.Service?.Category?.id;
//       const messagePrefix = catFromAttrib === 1 ? "Le bloc" : "Le numéro";

//       conflicts.push(
//         `${messagePrefix} ${entry.numero_attribue} a déjà été attribué à ${clientName} (${utilisationName}) le ${dateAttribution}`
//       );
//     }

//     // 6) Vérification disponibilité
//     const hasFilters = !!(serviceId || utilisationId || zoneId);
//     const isUSSD = (s) => /^\d{3,4}$/.test(s);

//     for (const numeroStr of rawNumeros) {
//       console.log("=== Vérification numéro ===", numeroStr);

//       // déjà en conflit général ?
//       if (conflictSet.has(numeroStr) || (/^\d+$/.test(numeroStr) && conflictSet.has(Number(numeroStr)))) {
//         console.log("Numéro déjà dans conflictSet :", numeroStr);
//         continue;
//       }

//       // CAS PARTICULIER : utilisationId = 15 (USSD)
//       if (parseInt(utilisationId) === 15) {
//         console.log("=== Vérification USSD pour utilisationId=15 ===");

//         if (!isUSSD(numeroStr)) {
//           outOfRangeNumeros.push(
//             `Le numéro ${numeroStr} n'est pas un code USSD valide (3 ou 4 chiffres).`
//           );
//           console.log("Numéro invalide USSD :", numeroStr);
//           continue;
//         }

//         // vérifier si le numéro est déjà attribué pour cette utilisation
//         const alreadyUsed = numeroConflicts.some((entry) => {
//           const utilisationAttrib = entry.AttributionNumero?.utilisation_id;
//           const utilisationPnn = entry.Pnn?.utilisation_id;
//           return entry.numero_attribue === numeroStr && (utilisationAttrib === 15 || utilisationPnn === 15);
//         });

//         console.log("Numéro déjà attribué ?", alreadyUsed);

//         if (alreadyUsed) {
//           conflicts.push(`Le code USSD ${numeroStr} a déjà été attribué à un client.`);
//         } else {
//           availableNumeros.push(`Le code ${numeroStr} est disponible pour l'utilisation USSD.`);
//           console.log("Numéro disponible :", numeroStr);
//         }

//         continue; // skip la logique PNN
//       }

//       // CAS NORMAL : services avec blocs PNN
//       let matchedPnn = null;
//       if (/^\d+$/.test(numeroStr)) {
//         const numeroInt = Number(numeroStr);
//         matchedPnn = activePnns.find(
//           (pnn) =>
//             numeroInt >= Number(pnn.bloc_min) &&
//             numeroInt <= Number(pnn.block_max)
//         );
//       }

//       if (!matchedPnn) {
//         outOfRangeNumeros.push(
//           `Le numéro ${numeroStr} ne correspond à aucun bloc PNN${hasFilters ? " pour le filtre sélectionné" : ""}.`
//         );
//         continue;
//       }

//       const categoryId = matchedPnn.Service?.Category?.id;
//       const messagePrefix = categoryId === 1 ? "Le bloc" : "Le numéro";
//       const utilisationNom =
//         matchedPnn.Utilisation?.nom ||
//         utilisationsMap[matchedPnn.utilisation_id] ||
//         "Utilisation inconnue";

//       availableNumeros.push(`${messagePrefix} ${numeroStr} est disponible. (${utilisationNom})`);
//     }

//     return res.json({
//       success: conflicts.length === 0 && outOfRangeNumeros.length === 0,
//       message:
//         conflicts.length > 0 || outOfRangeNumeros.length > 0
//           ? "Des problèmes ont été trouvés."
//           : "Tous les numéros sont valides et disponibles.",
//       conflicts,
//       outOfRangeNumeros,
//       availableNumeros
//     });
//   } catch (error) {
//     console.error("Erreur lors de la vérification des numéros :", error);
//     return res.json({
//       success: false,
//       message: "Erreur lors de la vérification des numéros."
//     });
//   }
// }

module.exports = { checkNumeroDisponibilite };
