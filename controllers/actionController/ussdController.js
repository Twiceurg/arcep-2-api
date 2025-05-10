const { USSD, Utilisation } = require("../../models");

// Fonction pour créer un USSD
async function createUSSD(req, res) {
  try {
    const { prefix, length, status, utilisation_id } = req.body;

    if (prefix === undefined || length === undefined) {
      return res
        .status(400)
        .json({ message: "Prefix et length sont obligatoires" });
    }

    const bloc_min = parseInt(`${prefix}0`.padEnd(length, "0"));
    const bloc_max = parseInt(`${prefix}9`.padEnd(length, "9"));

    const ussd = await USSD.create({
      prefix,
      length,
      bloc_min,
      utilisation_id,
      bloc_max,
      status: status !== undefined ? status : true
    });

    return res.status(201).json({
      success: true,
      message: "USSD créé avec succès",
      ussd
    });
  } catch (error) {
    console.error("Erreur lors de la création de l'USSD:", error);
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
}

// Fonction pour récupérer tous les USSDs
async function getAllUSSDs(req, res) {
  try {
    const ussds = await USSD.findAll({
      include: {
        model: Utilisation
      }
    });
    return res.status(200).json({
      success: true,
      ussds
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des USSDs:", error);
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
}

async function getUSSDById(req, res) {
  try {
    const { id } = req.params;

    const ussd = await USSD.findByPk(id, {
      include: {
        model: Utilisation
      }
    });

    if (!ussd) {
      return res.status(404).json({ message: "USSD non trouvé" });
    }

    return res.status(200).json({
      success: true,
      ussd
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'USSD:", error);
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
}

async function updateUSSD(req, res) {
  try {
    const { id } = req.params;
    const { prefix, length, status, utilisation_id } = req.body;

    if (prefix === undefined || length === undefined) {
      return res
        .status(400)
        .json({ message: "Prefix et length sont obligatoires" });
    }

    const ussd = await USSD.findByPk(id);

    if (!ussd) {
      return res.status(404).json({ message: "USSD non trouvé" });
    }

    const bloc_min = parseInt(`${prefix}0`.padEnd(length, "0"));
    const bloc_max = parseInt(`${prefix}9`.padEnd(length, "9"));

    ussd.prefix = prefix;
    ussd.length = length;
    ussd.bloc_min = bloc_min;
    ussd.bloc_max = bloc_max;
    ussd.status = status !== undefined ? status : ussd.status;

    if (utilisation_id !== undefined) {
      ussd.utilisation_id = utilisation_id;
    }

    await ussd.save();

    return res.status(200).json({
      success: true,
      message: "USSD mis à jour avec succès",
      ussd
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'USSD:", error);
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
}

async function deleteUSSD(req, res) {
  try {
    const { id } = req.params;

    const ussd = await USSD.findByPk(id);

    if (!ussd) {
      return res.status(404).json({ message: "USSD non trouvé" });
    }

    await ussd.destroy();
    return res.status(200).json({
      success: true,
      message: "USSD supprimé avec succès"
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'USSD:", error);
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
}

// Fonction pour activer ou désactiver un USSD
async function toggleStatusUSSD(req, res) {
  try {
    const { id } = req.params;

    const ussd = await USSD.findByPk(id);

    if (!ussd) {
      return res.status(404).json({ message: "USSD non trouvé" });
    }

    ussd.status = !ussd.status;

    await ussd.save();

    return res.status(200).json({
      success: true,
      message: `USSD ${ussd.status ? "activé" : "désactivé"} avec succès`,
      ussd
    });
  } catch (error) {
    console.error(
      "Erreur lors de l'activation/désactivation de l'USSD:",
      error
    );
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
}

async function getUSSDByUtilisationId(req, res) {
  try {
    const { utilisation_id } = req.params;

    // Utilisation de findAll pour récupérer tous les USSDs correspondant à l'utilisation_id
    const ussd = await USSD.findAll({
      where: { utilisation_id }, // Filtrage par utilisation_id
      include: [
        {
          model: Utilisation // Inclure les détails de l'utilisation
        }
      ]
    });

    // Si aucun USSD n'est trouvé, renvoyer false
    if (ussd.length === 0) {
      return res.status(200).json({ success: false });
    }

    // Réponse avec les USSDs trouvés
    return res.status(200).json({
      success: true,
      ussd // Renvoie le tableau des USSDs
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des USSDs par utilisation_id:",
      error
    );
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
}

module.exports = {
  createUSSD,
  getAllUSSDs,
  getUSSDById,
  updateUSSD,
  deleteUSSD,
  toggleStatusUSSD,
  getUSSDByUtilisationId
};
