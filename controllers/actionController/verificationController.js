const { Op } = require("sequelize");
const {
  NumeroAttribue,
  UssdAttribuer,
  AttributionNumero,
  USSDAttribution,
  Client,
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
    // Récupérer les conflits d'attribution PNN
    const numeroConflicts = await NumeroAttribue.findAll({
      where: {
        numero_attribue: { [Op.in]: numeros },
        statut: { [Op.ne]: "libre" }
      },
      include: [
        { model: AttributionNumero, include: [Client] },
        { model: Pnn, include: [Utilisation] }
      ]
    });

    // Récupérer les conflits d'attribution USSD
    const ussdConflicts = await UssdAttribuer.findAll({
      where: {
        ussd_attribue: { [Op.in]: numeros },
        statut: { [Op.ne]: "libre" }
      },
      include: [
        { model: USSDAttribution, include: [Client] },
        { model: USSD, include: [Utilisation] }
      ]
    });

    // Récupère tous les blocs valides avec utilisation
    const activePnns = await Pnn.findAll({
      where: { etat: true },
      include: [Utilisation]
    });

    const activeUssds = await USSD.findAll({
      where: { etat: true },
      include: [Utilisation]
    });

    const conflicts = [];
    const availableNumeros = [];
    const outOfRangeNumeros = [];

    // Conflits
    for (const entry of numeroConflicts) {
      const clientName =
        entry.AttributionNumero?.Client?.denomination || "client inconnu";
      const utilisationName =
        entry.Pnn?.Utilisation?.nom || "Utilisation inconnue";

      conflicts.push(
        `Le numéro ${entry.numero_attribue} a déjà été attribué à ${clientName} (${utilisationName})`
      );
    }

    for (const entry of ussdConflicts) {
      const clientName =
        entry.USSDAttribution?.Client?.denomination || "client inconnu";
      const utilisationName =
        entry.USSD?.Utilisation?.nom || "Utilisation inconnue";

      conflicts.push(
        `Le numéro ${entry.ussd_attribue} a déjà été attribué en USSD à ${clientName} (${utilisationName})`
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

      const isConflict =
        numeroConflicts.some(
          (entry) => String(entry.numero_attribue) === numeroStr
        ) ||
        ussdConflicts.some(
          (entry) => String(entry.ussd_attribue) === numeroStr
        );

      const matchedPnn = activePnns.find(
        (pnn) => numeroInt >= pnn.bloc_min && numeroInt <= pnn.block_max
      );

      const matchedUssd = activeUssds.find(
        (ussd) => numeroInt >= ussd.bloc_min && numeroInt <= ussd.bloc_max
      );

      if (!isConflict && (matchedPnn || matchedUssd)) {
        const utilisationName =
          matchedPnn?.Utilisation?.nom ||
          matchedUssd?.Utilisation?.nom ||
          "Utilisation inconnue";

        availableNumeros.push(
          `Le numéro ${numero} est disponible. (${utilisationName})`
        );
      }

      if (!matchedPnn && !matchedUssd) {
        outOfRangeNumeros.push(
          `Le numéro ${numero} ne fait pas partie d’un bloc PNN ou USSD valide.`
        );
      }
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
