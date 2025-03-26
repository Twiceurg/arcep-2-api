const {
  AttributionNumero,
  Client,
  Service,
  TypeUtilisation,
  Pnn
} = require("../../models");

class AttributionNumeroController {
  // 📌 Créer une attribution
  static async createAttribution(req, res) {
    try {
      const {
        type_utilisation_id,
        service_id,
        pnn_id,
        client_id,
        duree_utilisation,
        numero_attribue,
        reference_decision,
        etat_autorisation,
        utilisation_id
      } = req.body;

      // Validation : vérifier que le numéro attribué est fourni
      if (!numero_attribue) {
        return res
          .status(400)
          .json({ success: false, message: "Le numéro attribué est requis" });
      }
      if (!utilisation_id) {
        return res
          .status(400)
          .json({ success: false, message: "L attribution du service attribué est requis" });
      }

      // Vérifier si le PNN existe
      const pnn = await Pnn.findOne({ where: { id: pnn_id } });
      if (!pnn) {
        return res
          .status(404)
          .json({ success: false, message: "PNN introuvable" });
      }

      // Vérifier si le numéro est dans la plage autorisée
      if (numero_attribue < pnn.bloc_min || numero_attribue > pnn.block_max) {
        return res.status(400).json({
          success: false,
          message: "Le numéro attribué est en dehors de la plage autorisée"
        });
      }

      // Vérifier si le numéro existe déjà
      const existingAttribution = await AttributionNumero.findOne({
        where: { numero_attribue },
        include: [{ model: Client }]
      });
      if (existingAttribution) {
        return res.status(409).json({
          success: false,
          message: `Le numéro ${numero_attribue} a déjà été attribué à ${
            existingAttribution.Client
              ? existingAttribution.Client.denomination
              : "un client inconnu"
          }`
        });
      }

      // Calcul de la date d'expiration
      const dateExpiration = new Date();
      dateExpiration.setFullYear(
        dateExpiration.getFullYear() + parseInt(duree_utilisation, 10)
      );

      // Création de l'attribution
      const attribution = await AttributionNumero.create({
        type_utilisation_id,
        service_id,
        pnn_id,
        client_id,
        duree_utilisation,
        numero_attribue,
        reference_decision,
        date_expiration: dateExpiration, // Date calculée
        etat_autorisation ,
        utilisation_id,
      });

      return res.status(201).json({
        success: true,
        message: "Attribution créée avec succès",
        attribution
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // 📌 Récupérer toutes les attributions
  static async getAllAttributions(req, res) {
    try {
      const attributions = await AttributionNumero.findAll({
        include: [
          { model: Client },
          { model: Service },
          { model: TypeUtilisation },
          { model: Pnn }
        ]
      });

      return res.status(200).json(attributions);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }

  // 📌 Récupérer une attribution par ID
  static async getAttributionById(req, res) {
    try {
      const { id } = req.params;
      const attribution = await AttributionNumero.findByPk(id, {
        include: [
          { model: Client, attributes: ["denomination"] },
          { model: Service, attributes: ["nom_service"] },
          { model: TypeUtilisation, attributes: ["libele_type"] },
          { model: Pnn, attributes: ["partition_prefix"] }
        ]
      });

      if (!attribution) {
        return res.status(404).json({ message: "Attribution non trouvée" });
      }

      return res.status(200).json(attribution);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }

  // 📌 Mettre à jour une attribution
  static async updateAttribution(req, res) {
    try {
      const { id } = req.params;
      const {
        type_utilisation_id,
        service_id,
        pnn_id,
        client_id,
        duree_utilisation,
        numero_attribue,
        reference_decision,
        etat_autorisation
      } = req.body;

      // Vérifier si l'attribution existe
      const attribution = await AttributionNumero.findByPk(id);
      if (!attribution) {
        return res.status(404).json({ message: "Attribution non trouvée" });
      }

      // Mise à jour des champs
      attribution.type_utilisation_id = type_utilisation_id;
      attribution.service_id = service_id;
      attribution.pnn_id = pnn_id;
      attribution.client_id = client_id;
      attribution.duree_utilisation = duree_utilisation;
      attribution.numero_attribue = numero_attribue;
      attribution.reference_decision = reference_decision;
      attribution.etat_autorisation = etat_autorisation;

      // Recalcul de la date d'expiration si une nouvelle durée est fournie
      if (duree_utilisation) {
        const dateExpiration = new Date();
        dateExpiration.setFullYear(
          dateExpiration.getFullYear() + parseInt(duree_utilisation, 10)
        );
        attribution.date_expiration = dateExpiration;
      }

      await attribution.save();

      return res.status(200).json({
        success: true,
        message: "Attribution mise à jour avec succès",
        attribution
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }

  // 📌 Supprimer une attribution
  static async deleteAttribution(req, res) {
    try {
      const { id } = req.params;

      const attribution = await AttributionNumero.findByPk(id);
      if (!attribution) {
        return res.status(404).json({ message: "Attribution non trouvée" });
      }

      await attribution.destroy();
      return res
        .status(200)
        .json({ message: "Attribution supprimée avec succès" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }

  // 📌 Récupérer tous les numéros attribués pour un PNN
  static async getAssignedNumbersByPnn(req, res) {
    try {
      const { pnn_id } = req.params;

      if (!pnn_id) {
        return res.status(400).json({ error: "PNN ID est requis." });
      }

      // Recherche des attributions pour ce PNN avec état autorisation true
      const attributions = await AttributionNumero.findAll({
        where: {
          pnn_id,
          etat_autorisation: true // Filtrer uniquement les attributions autorisées
        },
        attributes: ["numero_attribue"] // On récupère juste le champ du numéro attribué
      });

      // Vérifier si des numéros ont été trouvés
      if (!attributions || attributions.length === 0) {
        return res.status(200).json([]); // Retourne un tableau vide si aucun numéro attribué
      }

      // Retourner directement les numéros attribués sans utiliser map
      return res.status(200).json(attributions);
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des numéros attribués :",
        error
      );
      return res.status(500).json({ error: "Erreur interne du serveur." });
    }
  }

  // 📌 Récupérer toutes les attributions d'un client par son ID
  static async getAttributionByClientId(req, res) {
    try {
      const { client_id } = req.params;

      if (!client_id) {
        return res.json({ success: false, message: "Client ID est requis" });
      }

      const attributions = await AttributionNumero.findAll({
        where: { client_id },
        include: [
          { model: Service },
          { model: TypeUtilisation },
          { model: Pnn }
        ]
      });

      if (!attributions || attributions.length === 0) {
        return res.json({
          success: false,
          message: "Aucune attribution trouvée pour ce client"
        });
      }

      return res.json({ success: true, attributions });
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }
}

module.exports = AttributionNumeroController;
