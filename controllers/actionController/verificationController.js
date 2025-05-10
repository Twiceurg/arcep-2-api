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
 * Vérifie si les numéros sont disponibles ou déjà attribués.
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

    const conflicts = [];
    const availableNumeros = [];

    for (const entry of numeroConflicts) {
      const clientName = entry.AttributionNumero?.Client?.denomination || "client inconnu";
      const pnnName = entry.Pnn?.partition_prefix || "PNN inconnu";
      const utilisationName = entry.Pnn?.Utilisation?.nom || "Utilisation inconnue";

      conflicts.push(
        `Le numéro ${entry.numero_attribue} a déjà été attribué à ${clientName} (${utilisationName})`
      );
    }

    for (const entry of ussdConflicts) {
      const clientName = entry.USSDAttribution?.Client?.denomination || "client inconnu";
      const ussdName = entry.USSD?.prefix || "USSD inconnu";
      const utilisationName = entry.USSD?.Utilisation?.nom || "Utilisation inconnue";

      conflicts.push(
        `Le numéro ${entry.ussd_attribue} a déjà été attribué en USSD à ${clientName} ( ${utilisationName})`
      );
    }

    // Génère les messages pour les numéros disponibles
    for (const numero of numeros) {
      const numeroStr = String(numero);
      const isConflict =
        numeroConflicts.some(entry => String(entry.numero_attribue) === numeroStr) ||
        ussdConflicts.some(entry => String(entry.ussd_attribue) === numeroStr);

      if (!isConflict) {
        availableNumeros.push(`Le numéro ${numero} est disponible.`);
      }
    }

    return res.json({
      success: conflicts.length === 0,
      message:
        conflicts.length > 0
          ? "Des conflits ont été trouvés"
          : "Tous les numéros sont disponibles",
      conflicts,
      availableNumeros
    });
  } catch (error) {
    console.error("Erreur lors de la vérification des numéros :", error);
    return res.json({
      success: false,
      message: "Erreur lors de la vérification des numéros"
    });
  }
}

module.exports = { checkNumeroDisponibilite };
