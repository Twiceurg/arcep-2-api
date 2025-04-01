const {
  AttributionNumero,
  Client,
  Service,
  TypeUtilisation,
  NumeroAttribue,
  Utilisation,
  Rapport,
  Renouvellement,
  Category,
  Pnn
} = require("../../models");
const { Op } = require("sequelize");

class AttributionNumeroController {
  // 📌 Créer une attribution
  static async createAttribution(req, res) {
    try {
      const {
        type_utilisation_id,
        service_id,
        pnn_id,
        client_id,
        numero_attribue, // Tableau des numéros attribués
        reference_decision,
        etat_autorisation,
        utilisation_id
      } = req.body;

      // Validation : vérifier que le tableau des numéros attribués est fourni
      if (
        !numero_attribue ||
        !Array.isArray(numero_attribue) ||
        numero_attribue.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Le tableau des numéros attribués est requis et doit être un tableau non vide"
        });
      }

      if (!utilisation_id) {
        return res.status(400).json({
          success: false,
          message: "L'attribution du service attribué est requise"
        });
      }

      // Vérifier si le PNN existe
      const pnn = await Pnn.findOne({ where: { id: pnn_id } });
      if (!pnn) {
        return res
          .status(404)
          .json({ success: false, message: "PNN introuvable" });
      }

      // Vérifier que chaque numéro est dans la plage autorisée
      for (const numero of numero_attribue) {
        if (numero < pnn.bloc_min || numero > pnn.block_max) {
          return res.status(400).json({
            success: false,
            message: `Le numéro ${numero} est en dehors de la plage autorisée`
          });
        }
      }

      // Vérifier si l'un des numéros existe déjà dans NumeroAttribue
      const existingNumbers = await NumeroAttribue.findAll({
        where: {
          numero_attribue: {
            [Op.in]: numero_attribue // Chercher tous les numéros dans le tableau
          }
        }
      });

      if (existingNumbers.length > 0) {
        const alreadyAssignedNumbers = existingNumbers.map(
          (num) => num.numero_attribue
        );
        return res.status(409).json({
          success: false,
          message: `Les numéros suivants sont déjà attribués: ${alreadyAssignedNumbers.join(
            ", "
          )}`
        });
      }

      // Calcul de la date d'expiration
      // const dateExpiration = new Date();
      // const dateAttribution = new Date();
      // dateExpiration.setFullYear(
      //   dateExpiration.getFullYear() + parseInt(duree_utilisation, 10)
      // );

      const etatAutorisation = false;
      // Créer une seule attribution (si ce n'est pas déjà fait) pour tous les numéros
      const attribution = await AttributionNumero.create({
        type_utilisation_id,
        service_id,
        pnn_id,
        client_id,
        reference_decision,
        etat_autorisation: etatAutorisation,
        utilisation_id
      });

      // Lier chaque numéro à cette attribution dans la table NumeroAttribue
      const numeroAttribueEntries = numero_attribue.map((numero) => ({
        attribution_id: attribution.id,
        numero_attribue: numero,
        created_at: new Date(),
        updated_at: new Date()
      }));

      // Insérer tous les numéros dans la table NumeroAttribue
      await NumeroAttribue.bulkCreate(numeroAttribueEntries);

      return res.status(201).json({
        success: true,
        message: "Attribution et numéros créés avec succès",
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
          {
            model: Service,
            include: [{ model: Category }] // 👈 Inclure `Category` pour pouvoir filtrer après
          },
          { model: TypeUtilisation },
          {
            model: Pnn,
            include: [{ model: Utilisation }]
          },
          { model: NumeroAttribue },
          { model: Rapport },
          {
            model: Renouvellement,
            limit: 1,
            order: [["date_renouvellement", "DESC"]]
          }
        ]
      });

      // 🛑 Filtrage en JavaScript après récupération
      const filteredAttributions = attributions.filter(
        (attr) => attr.Service && attr.Service.Category.id !== 1
      );

      return res.status(200).json(filteredAttributions);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }

  static async getAllAttributionsBloc(req, res) {
    try {
      const attributions = await AttributionNumero.findAll({
        include: [
          { model: Client },
          {
            model: Service,
            include: [{ model: Category }] // 👈 Inclure `Category` pour pouvoir filtrer après
          },
          { model: TypeUtilisation },
          {
            model: Pnn,
            include: [{ model: Utilisation }]
          },
          { model: NumeroAttribue },
          { model: Rapport },
          {
            model: Renouvellement,
            limit: 1,
            order: [["date_renouvellement", "DESC"]]
          }
        ]
      });

      // 🛑 Filtrage en JavaScript après récupération
      const filteredAttributions = attributions.filter(
        (attr) => attr.Service && attr.Service.Category.id === 1
      );

      console.log(filteredAttributions);
      return res.status(200).json(filteredAttributions);
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
          { model: Client },
          { model: Service },
          { model: TypeUtilisation },
          { model: Pnn },
          { model: NumeroAttribue }
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
  static async getAssignedNumbersByPnn(req, res) {+6
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
        attributes: ["id"] // On récupère l'id de l'attribution
      });

      // Vérifier si des attributions ont été trouvées
      if (!attributions || attributions.length === 0) {
        return res.status(200).json([]); // Retourne un tableau vide si aucune attribution trouvée
      }

      // Extraire les IDs des attributions pour la requête suivante
      const attributionIds = attributions.map((attribution) => attribution.id);

      // Rechercher les numéros attribués dans la table NumeroAttribues
      const assignedNumbers = await NumeroAttribue.findAll({
        where: {
          attribution_id: {
            [Op.in]: attributionIds // Rechercher les numéros attribués pour ces attributions
          },
          statut: "attribue"
        },
        attributes: ["numero_attribue"] // On récupère seulement les numéros attribués
      });

      // Vérifier si des numéros ont été trouvés
      if (!assignedNumbers || assignedNumbers.length === 0) {
        return res.status(200).json([]); // Retourner un tableau vide si aucun numéro attribué
      }

      // Retourner les numéros attribués
      return res.status(200).json(assignedNumbers);
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
          { model: Pnn },
          { model: NumeroAttribue }
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

  // la fontion pour assigner des references :

  static async assignReference(req, res) {
    try {
      const { id } = req.params;
      const { reference_decision, date_attribution, duree_utilisation } =
        req.body;

      // Vérifier si l'attribution existe avec son service
      const attribution = await AttributionNumero.findByPk(id, {
        include: [{ model: Service, include: [{ model: Category }] }]
      });

      if (!attribution) {
        return res.status(404).json({ message: "Attribution non trouvée" });
      }

      // Vérifier si le service associé a category_id = 1
      const categoryId =
        attribution.Service && attribution.Service.Category
          ? attribution.Service.Category.id
          : null;

      console.log("Category ID:", categoryId);

      // Vérifier si la référence est fournie
      if (!reference_decision) {
        return res.status(400).json({ message: "La référence est requise" });
      }

      // Vérifier si la date d'attribution est fournie
      const attributionDate = date_attribution
        ? new Date(date_attribution)
        : new Date();

      let dateExpiration = null; // On ne définit pas la date d'expiration par défaut

      if (categoryId !== 1) {
        // Si la catégorie N'EST PAS 1, on prend en compte la durée
        const match = duree_utilisation
          ? duree_utilisation.match(/^(\d+)\s*(mois|ans)$/i)
          : null;

        if (!match) {
          return res.status(400).json({
            message:
              "Durée invalide. Veuillez spécifier la durée (ex: 3 mois ou 2 ans)."
          });
        }

        const duree = parseInt(match[1], 10);
        const unite = match[2].toLowerCase();
        let dureeEnMois = duree;

        if (unite === "ans") {
          dureeEnMois *= 12; // Convertir en mois si c'est en années
        }

        // Calcul de la date d'expiration
        dateExpiration = new Date(attributionDate);
        dateExpiration.setMonth(dateExpiration.getMonth() + dureeEnMois);
      }

      // Mise à jour de l'attribution avec la nouvelle référence
      attribution.reference_decision = reference_decision;
      attribution.date_attribution = attributionDate;
      attribution.date_expiration = dateExpiration; // Peut être `null` si category_id = 1
      attribution.duree_utilisation =
        categoryId === 1 ? null : duree_utilisation;
      attribution.etat_autorisation = true;

      // Sauvegarder les modifications
      await attribution.save();

      return res.status(200).json({
        success: true,
        message: "Référence assignée et attribution mise à jour avec succès",
        attribution
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }
}

module.exports = AttributionNumeroController;
