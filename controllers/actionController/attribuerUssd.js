const {
  USSD,
  USSDAttribution,
  UssdAttribuer,
  UssdAttributionHistorique,
  Client,
  UssdDecision
} = require("../../models");

const { Op } = require("sequelize");

class AttributionUssdController {
  static async createUssdAttribution(req, res) {
    try {
      const { client_id, ussd_id, ussd_attribue } = req.body;

      console.log("🔵 Données reçues :", { client_id, ussd_id, ussd_attribue });

      const ussd = await USSD.findByPk(ussd_id);
      if (!ussd) {
        return res.json({
          success: false,
          message: "USSD introuvable"
        });
      }

      const { prefix, length, bloc_min, bloc_max } = ussd;

      console.log("🔍 Détails de l'USSD sélectionné :", {
        prefix,
        length,
        bloc_min,
        bloc_max
      });

      const invalidNumbers = [];
      const validNumbers = [];

      for (const num of ussd_attribue) {
        const numInt = parseInt(num); // Conversion sécurisée

        const isValidPrefix = num.toString().startsWith(prefix.toString());
        const isValidLength = num.toString().length === length;
        const isInRange = numInt >= bloc_min && numInt <= bloc_max;

        console.log(`🔢 Analyse du numéro : ${num}`);
        console.log(` - Commence par préfixe : ${isValidPrefix}`);
        console.log(
          ` - Longueur attendue : ${length}, Longueur reçue : ${
            num.toString().length
          }`
        );
        console.log(` - Numéro entier : ${numInt}`);
        console.log(
          ` - Est dans la plage ? ${isInRange} => ${bloc_min} <= ${numInt} <= ${bloc_max}`
        );

        if (!isValidPrefix || !isValidLength || !isInRange) {
          invalidNumbers.push(num);
        } else {
          validNumbers.push(num);
        }
      }

      console.log("✅ Numéros valides :", validNumbers);
      console.log("❌ Numéros invalides :", invalidNumbers);

      if (invalidNumbers.length > 0) {
        return res.json({
          success: false,
          message: `Les numéros suivants sont hors plage : ${invalidNumbers.join(
            ", "
          )}`
        });
      }

      const attribution = await USSDAttribution.create({ client_id, ussd_id });

      const attribs = validNumbers.map((num) => ({
        ussd_attribution_id: attribution.id,
        ussd_id,
        ussd_attribue: num,
        statut: "attribue"
      }));

      console.log("📦 Enregistrements à créer dans UssdAttribuer :", attribs);

      await UssdAttribuer.bulkCreate(attribs);

      return res.json({
        success: true,
        message: "Attribution USSD créée avec succès",
        attribution,
        numeros_attribues: validNumbers
      });
    } catch (error) {
      console.error("❗ Erreur lors de la création de l'attribution :", error);
      return res
        .status(500)
        .json({ message: "Erreur serveur", error: error.message });
    }
  }

  static async getAllUssdAttributions(req, res) {
    try {
      const { clientId, ussdId, mois, annee, expirer } = req.query;
  
      const whereConditions = {};
  
      if (clientId) {
        whereConditions.client_id = clientId;
      }
  
      if (ussdId) {
        whereConditions.ussd_id = ussdId;
      }
  
      // Filtre par mois et année
      if (mois && annee) {
        const startDate = new Date(annee, mois - 1, 1);
        const endDate = new Date(annee, mois, 0);
        whereConditions.created_at = {
          [Sequelize.Op.gte]: startDate,
          [Sequelize.Op.lte]: endDate,
        };
      }
  
      const ussdAttributions = await USSDAttribution.findAll({
        where: whereConditions,
        include: [
          { model: Client },
          { model: UssdAttribuer },
          { model: USSD },
          {
            model: UssdDecision,
            order: [["date_attribution", "ASC"]],
          },
        ],
      });
  
      // Fonction pour récupérer la décision pertinente
      const getDecisionPertinente = (decisions = []) => {
        if (decisions.length === 0) return null;
  
        const sorted = [...decisions].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
  
        const resiliation = sorted.find((d) => d.type_decision === "résiliation");
        if (resiliation) return resiliation;
  
        const retrait = sorted.find((d) => d.type_decision === "retrait");
        if (retrait) return retrait;
  
        const suspension = sorted.find((d) => d.type_decision === "suspension");
        if (
          suspension?.date_expiration &&
          new Date() < new Date(suspension.date_expiration)
        ) {
          return suspension;
        }
  
        const modifOrRecla = sorted.find(
          (d) =>
            d.type_decision === "modification" ||
            d.type_decision === "reclamation"
        );
        if (modifOrRecla) return modifOrRecla;
  
        const renouvellement = sorted.find(
          (d) => d.type_decision === "renouvellement"
        );
        if (renouvellement) return renouvellement;
  
        return (
          sorted.find((d) => d.type_decision === "attribution") || sorted[0]
        );
      };
  
      // ➕ Ajout de la décision pertinente à chaque attribution
      let results = ussdAttributions.map((attr) => {
        const attrPlain = attr.get({ plain: true });
        const decisionPertinente = getDecisionPertinente(attrPlain.UssdDecisions);
  
        return {
          ...attrPlain,
          decision_pertinente: decisionPertinente,
        };
      });
  
      // Filtrage selon expiration si demandé
      if (expirer === "true") {
        results = results.filter(
          (attr) =>
            !attr.decision_pertinente?.date_expiration ||
            new Date(attr.decision_pertinente.date_expiration) < new Date()
        );
      } else if (expirer === "false") {
        results = results.filter(
          (attr) =>
            attr.decision_pertinente?.date_expiration &&
            new Date(attr.decision_pertinente.date_expiration) > new Date()
        );
      }
  
      return res.status(200).json(results);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  }
  
  static async reclamerUssdAttribution(req, res) {
    try {
      const { id } = req.params; // ID de l'attribution USSD
      const { client_id, ussd_id, ussd_attribue, motif } = req.body;
      const file = req.file;
  
      if (!ussd_attribue || !Array.isArray(ussd_attribue) || ussd_attribue.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Le tableau des USSD attribués est requis et doit être non vide"
        });
      }
  
      const attribution = await USSDAttribution.findByPk(id);
      if (!attribution) {
        return res.status(404).json({ success: false, message: "Attribution introuvable" });
      }
  
      const ussd = await USSD.findByPk(ussd_id);
      if (!ussd) {
        return res.status(404).json({ success: false, message: "USSD introuvable" });
      }
  
      const { prefix, length, bloc_min, bloc_max } = ussd;
      const invalidNumbers = [];
      const validNumbers = [];
  
      for (const num of ussd_attribue) {
        const numInt = parseInt(num);
        const isValidPrefix = num.toString().startsWith(prefix.toString());
        const isValidLength = num.toString().length === length;
        const isInRange = numInt >= bloc_min && numInt <= bloc_max;
  
        if (!isValidPrefix || !isValidLength || !isInRange) {
          invalidNumbers.push(num);
        } else {
          validNumbers.push(num);
        }
      }
  
      if (invalidNumbers.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Les numéros suivants sont hors plage ou invalides : ${invalidNumbers.join(", ")}`
        });
      }
  
      // Récupérer les numéros déjà attribués
      const existing = await UssdAttribuer.findAll({
        where: {
          ussd_attribution_id: id
        }
      });
  
      const existingNumbers = existing.map((e) => e.ussd_attribue);
  
      const toDelete = existingNumbers.filter((num) => !validNumbers.includes(num));
      const toAdd = validNumbers.filter((num) => !existingNumbers.includes(num));
  
      // Supprimer ceux qui ne sont plus attribués
      if (toDelete.length > 0) {
        await UssdAttribuer.destroy({
          where: {
            ussd_attribution_id: id,
            ussd_attribue: { [Op.in]: toDelete }
          }
        });
      }
  
      // Ajouter les nouveaux
      const newEntries = toAdd.map((num) => ({
        ussd_attribution_id: id,
        ussd_id,
        ussd_attribue: num,
        statut: "attribue"
      }));
  
      await UssdAttribuer.bulkCreate(newEntries);
  
      // Sauvegarde de l'historique (à adapter selon ton modèle UssdAttributionHistorique)
      await UssdAttributionHistorique.create({
        ussd_attribution_id: id,
        client_id,
        ussd_id,
        utilisateur_id: req.user.id,
        type_modification: "reclamation",
        motif: motif || "Réclamation de l’attribution USSD",
        fichier: file ? `/uploads/${file.filename}` : null,
        date_modification: new Date()
      });
  
      return res.json({
        success: true,
        message: "Réclamation effectuée avec succès",
        ussd_attribution: attribution,
        nouveaux_numeros: toAdd,
        numeros_supprimes: toDelete
      });
  
    } catch (error) {
      console.error("❗ Erreur lors de la réclamation :", error);
      return res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
  }
  

  static async getAttributionUssdDecisions(req, res) {
    const { id } = req.params; // Récupérer l'id depuis les paramètres de la route

    // Vérifier si l'attributionId est défini
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "L'identifiant de l'attribution est requis."
      });
    }

    try {
      const decisions = await UssdDecision.findAll({
        where: { ussd_attribution_id: id }  
      });

      // Vérifier si des décisions existent
      if (decisions.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Aucune décision trouvée pour cette attribution."
        });
      }

      // Retourner les décisions sous forme de JSON
      return res.status(200).json({
        success: true,
        data: decisions.map((decision) => decision.toJSON()) // Convertir chaque instance en JSON
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des décisions :", error);
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des décisions."
      });
    }
  }

  // static async getUssdAttributionById(req, res) {
  //   try {
  //     const { id } = req.params;

  //     const attribution = await USSDAttribution.findByPk(id, {
  //       include: [
  //         { model: Client },
  //         { model: USSD },
  //         { model: UssdAttribuer },
  //         {
  //           model: UssdDecision, 
  //           order: [["created_at", "ASC"]]
  //         }
  //       ]
  //     });

  //     if (!attribution) {
  //       return res.status(404).json({ message: "Attribution non trouvée" });
  //     }

  //     // Détermination de la décision pertinente
  //     const getDecisionPertinente = (decisions) => {
  //       if (!decisions || decisions.length === 0) return null;

  //       const sorted = [...decisions].sort(
  //         (a, b) => new Date(b.created_at) - new Date(a.created_at)
  //       );

  //       const resiliation = sorted.find(
  //         (d) => d.type_decision === "résiliation"
  //       );
  //       if (resiliation) return resiliation;

  //       const retrait = sorted.find((d) => d.type_decision === "retrait");
  //       if (retrait) return retrait;

  //       const suspension = sorted.find((d) => d.type_decision === "suspension");
  //       if (
  //         suspension?.date_expiration &&
  //         new Date() < new Date(suspension.date_expiration)
  //       ) {
  //         return suspension;
  //       }

  //       const modifOrRecla = sorted.find(
  //         (d) =>
  //           d.type_decision === "modification" ||
  //           d.type_decision === "reclamation"
  //       );
  //       if (modifOrRecla) return modifOrRecla;

  //       const renouvellement = sorted.find(
  //         (d) => d.type_decision === "renouvellement"
  //       );
  //       if (renouvellement) return renouvellement;

  //       return (
  //         sorted.find((d) => d.type_decision === "attribution") || sorted[0]
  //       );
  //     };

  //     const attrPlain = attribution.get({ plain: true });
  //     const decisionPertinente = getDecisionPertinente(attrPlain.decisions);

  //     return res.status(200).json({
  //       ...attrPlain,
  //       decision_pertinente: decisionPertinente
  //     });
  //   } catch (error) {
  //     console.error(error);
  //     return res.status(500).json({ message: "Erreur interne du serveur" });
  //   }
  // }

  static async getAssignedNumbersByUssd(req, res) {
    try {
      const { ussd_id } = req.params;

      if (!ussd_id) {
        return res.status(400).json({ error: "USSD ID est requis." });
      }

      // Recherche des attributions pour ce USSD avec état autorisation true
      const attributions = await USSDAttribution.findAll({
        where: {
          ussd_id
        },
        attributes: ["id"] // On récupère l'id de l'attribution
      });

      // Vérifier si des attributions ont été trouvées
      if (!attributions || attributions.length === 0) {
        return res.status(200).json([]); // Retourne un tableau vide si aucune attribution trouvée
      }

      // Extraire les IDs des attributions pour la requête suivante
      const attributionIds = attributions.map((attribution) => attribution.id);

      // Rechercher les numéros attribués dans la table UssdAttribuer
      const assignedNumbers = await UssdAttribuer.findAll({
        where: {
          ussd_attribution_id: {
            [Op.in]: attributionIds // Rechercher les numéros attribués pour ces attributions
          },
          statut: {
            [Op.ne]: "libre" // Vérifier que le statut est différent de "libre"
          }
        },
        attributes: ["ussd_attribue"] // On récupère seulement les numéros attribués
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

  static async getUssdAttributionById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.json({
          success: false,
          message: "USSD Attribution ID est requis"
        });
      }

      // Recherche de l'attribution par son ID
      const attribution = await USSDAttribution.findByPk(id, {
        include: [
          { model: USSD },
          { model: Client },
          { model: UssdAttribuer},
          {
            model: UssdDecision,
            order: [["created_at", "ASC"]]
          }
        ]
      });

      if (!attribution) {
        return res.json({
          success: false,
          message: "Aucune attribution trouvée pour cet ID"
        });
      }

      return res.json({ success: true, attribution });
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  static async assignUssdReference(req, res) {
    try {
      const { id } = req.params;
      const { reference_decision, date_attribution, duree_utilisation } =
        req.body;
      const file = req.file;

      // Vérifier si l'attribution USSD existe
      const ussdAttribution = await USSDAttribution.findByPk(id, {
        include: [{ model: USSD }] // Inclure le modèle USSD pour l'attribution
      });

      if (!ussdAttribution) {
        return res
          .status(404)
          .json({ message: "Attribution USSD non trouvée" });
      }

      // Vérifier si la référence est fournie
      if (!reference_decision) {
        return res.status(400).json({ message: "La référence est requise" });
      }

      // Vérifier si la date d'attribution est fournie
      const attributionDate = date_attribution
        ? new Date(date_attribution)
        : new Date();

      let dateExpiration = null; // Par défaut, pas de date d'expiration

      // Si une durée d'utilisation est spécifiée, calculer la date d'expiration
      if (duree_utilisation) {
        const match = duree_utilisation.match(/^(\d+)\s*(mois|ans)$/i);

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

      // Création de la décision d'attribution pour USSD
      const ussdDecision = await UssdDecision.create({
        ussd_attribution_id: ussdAttribution.id, // L'ID de l'attribution USSD
        reference_decision, // La référence
        date_attribution: attributionDate,
        date_expiration: dateExpiration, // Peut être `null` si pas de durée spécifiée
        duree_utilisation,
        etat_autorisation: true,
        fichier: file ? `/uploads/${file.filename}` : null, // Si un fichier est téléchargé, l'ajouter
        type_decision: "attribution"
      });

      // Réponse si l'attribution et la décision ont été bien mises à jour
      return res.status(200).json({
        success: true,
        message:
          "Référence USSD assignée et attribution mise à jour avec succès",
        ussdDecision
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }
  

  static async assignUssdReservationReference(req, res) {
    try {
      const { id } = req.params;
      const { reference_decision, date_attribution, duree_utilisation } =
        req.body;
      const file = req.file;

      // Vérifier si l'attribution USSD existe
      const ussdAttribution = await USSDAttribution.findByPk(id, {
        include: [{ model: USSD }] // Inclure le modèle USSD pour l'attribution
      });

      if (!ussdAttribution) {
        return res
          .status(404)
          .json({ message: "Attribution USSD non trouvée" });
      }

      // Vérifier si la référence est fournie
      if (!reference_decision) {
        return res.status(400).json({ message: "La référence est requise" });
      }

      // Vérifier si la date d'attribution est fournie
      const attributionDate = date_attribution
        ? new Date(date_attribution)
        : new Date();

      let dateExpiration = null; // Par défaut, pas de date d'expiration

      // Si une durée d'utilisation est spécifiée, calculer la date d'expiration
      if (duree_utilisation) {
        const match = duree_utilisation.match(/^(\d+)\s*(mois|ans)$/i);

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

      const ussdAttribue = await UssdAttribuer.findOne({
        where: { ussd_attribution_id: ussdAttribution.id }
      });

      if (!ussdAttribue) {
        return res.status(404).json({ message: "USSD attribué non trouvé" });
      }

      ussdAttribue.statut = "reservation";
      await ussdAttribue.save();

      // Création de la décision d'attribution pour USSD
      const ussdDecision = await UssdDecision.create({
        ussd_attribution_id: ussdAttribution.id, // L'ID de l'attribution USSD
        reference_decision, // La référence
        date_attribution: attributionDate,
        date_expiration: dateExpiration, // Peut être `null` si pas de durée spécifiée
        duree_utilisation,
        etat_autorisation: true,
        fichier: file ? `/uploads/${file.filename}` : null, // Si un fichier est téléchargé, l'ajouter
        type_decision: "reservation"
      });

      // Réponse si l'attribution et la décision ont été bien mises à jour
      return res.status(200).json({
        success: true,
        message:
          "Référence USSD assignée et attribution mise à jour avec succès",
        ussdDecision
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }
}

module.exports = AttributionUssdController;
