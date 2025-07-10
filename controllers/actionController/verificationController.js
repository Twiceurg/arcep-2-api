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
  const { numeros } = req.body;

  console.log("Numéros reçus pour vérification :", numeros);

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
    // Récupérer les conflits d'attribution PNN
    const numeroConflicts = await NumeroAttribue.findAll({
      where: {
        numero_attribue: { [Op.in]: numeros },
        statut: { [Op.ne]: "libre" }
      },
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

    // Récupère tous les blocs valides avec utilisation, service et catégorie
    const activePnns = await Pnn.findAll({
      where: { etat: true },
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

      // if (!matchedPnn) {
      //   outOfRangeNumeros.push(
      //     `Le numéro ${numero} ne fait pas partie d’un bloc PNN valide.`
      //   );
      //   continue; // Important d'arrêter ici pour ce numéro
      // }

      if (!matchedPnn) {
        if (numeroStr.length >= 3 && numeroStr.length <= 4) {
          availableNumeros.push(
            `Le numéro ${numero} est disponible (USSD détecté)`
          );
        } else {
          outOfRangeNumeros.push(
            `Le numéro ${numero} ne fait pas partie d’un bloc PNN  ou numero USSD valide.`
          );
        }
        continue;
      }

      const isConflict = numeroConflicts.some(
        (entry) => String(entry.numero_attribue) === numeroStr
      );

      if (isConflict) {
        // Le message de conflit sera déjà ajouté dans la boucle précédente
        // Si tu veux ici aussi, tu peux l'ajouter, mais évite la redondance
        continue;
      }

      // Numéro valide, pas de conflit
      const categoryId = matchedPnn.Service?.Category?.id;

      let messagePrefix = "Le numéro";
      if (categoryId === 1) {
        messagePrefix = "Le bloc";
      }

      const utilisationNom =
        matchedPnn.Utilisation?.nom ||
        (utilisationsMap[matchedPnn.utilisation_id] ?? "Utilisation inconnue");

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
