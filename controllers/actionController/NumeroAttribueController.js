const { NumeroAttribue, AttributionNumero, Client } = require("../../models");

// ✅ Récupérer tous les numéros avec leur attribution et le client associé
exports.getAllNumerosAvecAttribution = async (req, res) => {
  try {
    const numeros = await NumeroAttribue.findAll({
      include: [
        {
          model: AttributionNumero,
          include: [{ model: Client }] // Jointure avec Client
        }
      ]
    });

    if (numeros.length === 0) {
      return res.status(200).json({ success: true, message: "Aucun numéro trouvé", numeros: [] });
    }

    return res.status(200).json({ success: true, message: "Liste des numéros récupérée avec succès", numeros });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Erreur lors de la récupération des numéros" });
  }
};

// ✅ Libérer un numéro attribué (mettre son statut à "libre")
exports.libererNumeroAttribue = async (req, res) => {
  try {
    const { id } = req.params;
    const numero = await NumeroAttribue.findByPk(id);

    if (!numero) {
      return res.status(404).json({ success: false, message: "Numéro non trouvé" });
    }

    if (numero.statut === "libre") {
      return res.status(400).json({ success: false, message: "Ce numéro est déjà libre" });
    }

    numero.statut = "libre";
    await numero.save();

    return res.status(200).json({ success: true, message: "Numéro libéré avec succès" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Erreur lors de la libération du numéro" });
  }
};
