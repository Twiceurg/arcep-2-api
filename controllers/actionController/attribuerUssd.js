const {
  USSD,
  USSDAttribution,
  UssdAttribuer,
  UssdAttributionHistorique,
  AttributionNumero,
  TypeUtilisation,
  NumeroAttribue,
  Client,
  Utilisation,
  RapportUssd,
  UssdDecision,
  Utilisateur,
  HistoriqueAttributionUSSD,
  UssdRenouvellement
} = require("../../models");

const { Op } = require("sequelize");

class AttributionUssdController {
  static async createUssdAttribution(req, res) {
    try {
      const { client_id, ussd_id, ussd_attribue } = req.body;

      const utilisation_id = parseInt(req.body.utilisation_id, 10);
      const type_utilisation_id = parseInt(req.body.type_utilisation_id, 10);

      const ussd = await USSD.findByPk(ussd_id);
      if (!ussd) {
        return res.json({
          success: false,
          message: "USSD introuvable"
        });
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
        return res.json({
          success: false,
          message: `Les numéros suivants sont hors plage : ${invalidNumbers.join(
            ", "
          )}`
        });
      }

      // Vérification de conflits
      const numeroConflicts = await NumeroAttribue.findAll({
        where: {
          numero_attribue: {
            [Op.in]: validNumbers
          },
          statut: {
            [Op.ne]: "libre" // Si le statut est différent de 'libre', c'est un conflit
          }
        },
        include: [
          {
            model: AttributionNumero,
            include: [Client] // Inclure les détails du client auquel le numéro est attribué
          }
        ]
      });

      const ussdConflicts = await UssdAttribuer.findAll({
        where: {
          ussd_attribue: {
            [Op.in]: validNumbers
          },
          statut: {
            [Op.ne]: "libre" // Si le statut est différent de 'libre', c'est un conflit
          }
        },
        include: [
          {
            model: USSDAttribution,
            include: [Client] // Inclure les détails du client auquel l'USSD est attribué
          }
        ]
      });

      const conflicts = [];

      numeroConflicts.forEach((entry) => {
        const clientName =
          entry.AttributionNumero?.Client?.denomination || "client inconnu";
        conflicts.push(
          `Le numéro ${entry.numero_attribue} a déjà été attribué a : ${clientName}`
        );
      });

      ussdConflicts.forEach((entry) => {
        const clientName =
          entry.USSDAttribution?.Client?.denomination || "client inconnu";
        conflicts.push(
          `Le numéro ${entry.ussd_attribue} a déjà été attribué en USSD a : ${clientName}`
        );
      });

      if (conflicts.length > 0) {
        return res.json({
          success: false,
          message: conflicts.join(" ; ")
        });
      }

      // Création de l’attribution
      const attribution = await USSDAttribution.create({
        client_id,
        ussd_id,
        utilisation_id,
        type_utilisation_id
      });

      const attribs = validNumbers.map((num) => ({
        ussd_attribution_id: attribution.id,
        ussd_id,
        utilisation_id,
        ussd_attribue: num,
        statut: "attribue"
      }));

      const UssdAttribues = await UssdAttribuer.bulkCreate(attribs);

      const historiqueEntries = UssdAttribues.map((UssdAttribue) => ({
        ussd_attribution_id: attribution.id,
        numero_id: UssdAttribue.id,
        numero: UssdAttribue.ussd_attribue,
        utilisation_id,
        date_attribution: new Date(),
        motif: "Attribution initiale",
        utilisateur_id: req.user.id,
        created_at: new Date(),
        updated_at: new Date()
      }));

      await HistoriqueAttributionUSSD.bulkCreate(historiqueEntries);

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
      const {
        clientId,
        ussdId,
        mois,
        renouveler,
        annee,
        utilisationId,
        expirer,
        startDate: startStr,
        endDate: endStr
      } = req.query;

      const whereConditions = {};

      if (clientId) {
        whereConditions.client_id = clientId;
      }

      if (utilisationId) {
        whereConditions.utilisation_id = utilisationId;
      }

      if (ussdId) {
        whereConditions.ussd_id = ussdId;
      }
      let startDate, endDate;

      if (startStr && endStr) {
        startDate = new Date(startStr);
        endDate = new Date(endStr);
        whereConditions.date_attribution = {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        };
      } else if (mois && annee) {
        startDate = new Date(annee, mois - 1, 1);
        endDate = new Date(annee, mois, 0);
        whereConditions.date_attribution = {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        };
      } else if (mois) {
        const currentYear = new Date().getFullYear();
        startDate = new Date(currentYear, mois - 1, 1);
        endDate = new Date(currentYear, mois, 0);
        whereConditions.date_attribution = {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        };
      } else if (annee) {
        startDate = new Date(annee, 0, 1);
        endDate = new Date(annee, 11, 31);
        whereConditions.date_attribution = {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        };
      }

      const ussdAttributions = await USSDAttribution.findAll({
        where: whereConditions,
        include: [
          { model: Client },
          { model: UssdAttribuer },
          {
            model: USSD,
            include: [{ model: Utilisation }]
          },
          { model: TypeUtilisation },
          {
            model: UssdDecision,
            order: [["date_attribution", "ASC"]]
          },
          { model: RapportUssd },
          { model: Utilisation }
        ]
      });

      // Fonction pour récupérer la décision pertinente
      const getDecisionPertinente = (decisions = []) => {
        if (decisions.length === 0) return null;

        const sorted = [...decisions].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        const resiliation = sorted.find(
          (d) => d.type_decision === "résiliation"
        );
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
        const decisionPertinente = getDecisionPertinente(
          attrPlain.UssdDecisions
        );

        return {
          ...attrPlain,
          decision_pertinente: decisionPertinente
        };
      });
      const filtrageActif =
        utilisationId ||
        renouveler === "true" ||
        renouveler === "false" ||
        expirer === "true" ||
        expirer === "false" ||
        mois ||
        annee ||
        startStr ||
        endStr;

      if (filtrageActif) {
        results = results.filter((attr) => attr.decision_pertinente);
      }

      if (utilisationId) {
        const utilIdInt = parseInt(utilisationId, 10);
        results = results.filter(
          (attr) => attr.USSD?.Utilisation?.id === utilIdInt
        );
      }

      if (renouveler === "true") {
        results = results.filter(
          (attr) => attr.decision_pertinente?.type_decision === "renouvellement"
        );
      }
      // Filtrage selon expiration si demandé
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expirer === "true") {
        results = results.filter((attr) => {
          const exp = attr.decision_pertinente?.date_expiration;
          if (!exp) return false;
          const expDate = new Date(exp);
          expDate.setHours(0, 0, 0, 0);
          return expDate < today;
        });
      } else if (expirer === "false") {
        results = results.filter((attr) => {
          const exp = attr.decision_pertinente?.date_expiration;
          if (!exp) return false;
          const expDate = new Date(exp);
          expDate.setHours(0, 0, 0, 0);
          return expDate >= today;
        });
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
      const utilisation_id = parseInt(req.body.utilisation_id, 10);
      const type_utilisation_id = parseInt(req.body.type_utilisation_id, 10);
      const file = req.file;

      // Vérification des données requises
      if (
        !ussd_attribue ||
        !Array.isArray(ussd_attribue) ||
        ussd_attribue.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Le tableau des USSD attribués est requis et doit être non vide"
        });
      }

      // Récupération de l'attribution
      const attribution = await USSDAttribution.findByPk(id);
      if (!attribution) {
        return res
          .status(404)
          .json({ success: false, message: "Attribution introuvable" });
      }

      // Mise à jour de l'attribution si utilisation_id est présent
      if (utilisation_id) {
        attribution.utilisation_id = utilisation_id;
        await attribution.save();
      }
      if (type_utilisation_id) {
        attribution.type_utilisation_id = type_utilisation_id;
        await attribution.save();
      }

      // Vérification de l'USSD
      const ussd = await USSD.findByPk(ussd_id);
      if (!ussd) {
        return res
          .status(404)
          .json({ success: false, message: "USSD introuvable" });
      }

      const { prefix, length, bloc_min, bloc_max } = ussd;
      const invalidNumbers = [];
      const validNumbers = [];

      // Validation des numéros attribués
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

      // Si des numéros sont invalides
      if (invalidNumbers.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Les numéros suivants sont hors plage ou invalides : ${invalidNumbers.join(
            ", "
          )}`
        });
      }

      // Vérification de conflits
      const numeroConflicts = await NumeroAttribue.findAll({
        where: {
          numero_attribue: {
            [Op.in]: validNumbers
          },
          statut: {
            [Op.ne]: "libre" // Si le statut est différent de 'libre', c'est un conflit
          }
        },
        include: [
          {
            model: AttributionNumero,
            include: [Client]
          }
        ]
      });

      const ussdConflicts = await UssdAttribuer.findAll({
        where: {
          ussd_attribue: {
            [Op.in]: validNumbers
          },
          statut: {
            [Op.ne]: "libre" // Si le statut est différent de 'libre', c'est un conflit
          }
        },
        include: [
          {
            model: USSDAttribution,
            include: [Client]
          }
        ]
      });

      const conflicts = [];

      numeroConflicts.forEach((entry) => {
        const clientName =
          entry.AttributionNumero?.Client?.denomination || "client inconnu";
        conflicts.push(
          `Le numéro ${entry.numero_attribue} a déjà été attribué à : ${clientName}`
        );
      });

      ussdConflicts.forEach((entry) => {
        const clientName =
          entry.USSDAttribution?.Client?.denomination || "client inconnu";
        conflicts.push(
          `Le numéro ${entry.ussd_attribue} a déjà été attribué en USSD à : ${clientName}`
        );
      });

      if (conflicts.length > 0) {
        return res.json({
          success: false,
          message: conflicts.join(" ; ")
        });
      }

      // Récupérer les numéros déjà attribués
      const existing = await UssdAttribuer.findAll({
        where: {
          ussd_attribution_id: id
        }
      });

      const existingNumbers = existing.map((e) => e.ussd_attribue);

      const toDelete = existingNumbers.filter(
        (num) => !validNumbers.includes(num)
      );
      const toAdd = validNumbers.filter(
        (num) => !existingNumbers.includes(num)
      );

      // Créer les entrées à ajouter dans UssdAttribuer
      const newEntries = toAdd.map((num) => ({
        ussd_attribution_id: id,
        ussd_id,
        ussd_attribue: num,
        statut: "attribue",
        utilisation_id
      }));

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
      const UssdAttribues = await UssdAttribuer.bulkCreate(newEntries);

      const historiqueEntries = UssdAttribues.map((UssdAttribue) => ({
        ussd_attribution_id: attribution.id,
        numero_id: UssdAttribue.id,
        numero: UssdAttribue.ussd_attribue,
        date_attribution: new Date(),
        motif: motif || "Reclamation de l'attribution",
        utilisateur_id: req.user.id,
        created_at: new Date(),
        updated_at: new Date()
      }));

      // Insérer les historiques dans la table HistoriqueAttributionNumero
      await HistoriqueAttributionUSSD.bulkCreate(historiqueEntries);

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
      return res
        .status(500)
        .json({ message: "Erreur serveur", error: error.message });
    }
  }

  static async getAttributionUssdDecisions(req, res) {
    const { id } = req.params;  

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "L'identifiant de l'attribution est requis."
      });
    }

    try {
      // Récupérer toutes les décisions liées aux numéros de l'attribution
      const decisions = await AttributionDecision.findAll({
        include: [
          {
            model: NumeroAttribue,
            through: { attributes: [] }, // pour table pivot DecisionNumeros
            where: { attribution_id: id }
          }
        ]
      });

      if (!decisions.length) {
        return res.status(404).json({
          success: false,
          message: "Aucune décision trouvée pour cette attribution."
        });
      }

      return res.status(200).json({
        success: true,
        data: decisions.map((decision) => decision.toJSON())
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des décisions :", error);
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des décisions."
      });
    }
  }

  static async getAllUssdHistoriques(req, res) {
    try {
      const historiques = await HistoriqueAttributionUSSD.findAll({
        order: [["created_at", "DESC"]],
        include: [
          {
            model: USSDAttribution,
            include: [
              { model: Client },
              { model: USSD },
              { model: UssdAttribuer },
              { model: RapportUssd },
              { model: UssdRenouvellement },
              { model: UssdDecision }, // ⚠️ Attention : ici, tu dois avoir un hasMany/belongsToMany si tu veux récupérer un tableau
              { model: UssdAttributionHistorique }
            ]
          },
          {
            model: Utilisateur
          }
        ]
      });

      // 🔎 Fonction pour déterminer la décision pertinente
      const getDecisionPertinente = (decisions) => {
        if (!decisions || decisions.length === 0) return null;

        const sorted = [...decisions].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        const resiliation = sorted.find(
          (d) => d.type_decision === "résiliation"
        );
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

        const modifOrRecla = sorted.find((d) =>
          ["modification", "reclamation"].includes(d.type_decision)
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

      // 🛠 Traitement des historiques pour ajouter la décision pertinente
      const historiquesWithDecision = historiques.map((histo) => {
        const histoPlain = histo.get({ plain: true });
        const attribution = histoPlain.USSDAttribution;

        if (attribution?.UssdDecisions) {
          const decisionPertinente = getDecisionPertinente(
            attribution.UssdDecisions
          );
          histoPlain.USSDAttribution.decision_pertinente = decisionPertinente;
        }

        return histoPlain;
      });

      return res.status(200).json({
        success: true,
        data: historiquesWithDecision
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des historiques:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des historiques"
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
          { model: UssdAttribuer },
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

      ussdAttribution.date_attribution = attributionDate;
      await ussdAttribution.save();

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

      // Trouver tous les numéros USSD attribués liés à l'attribution
      const numerosAttribues = await UssdAttribuer.findAll({
        where: { ussd_attribution_id: ussdAttribution.id }
      });

      if (!numerosAttribues.length) {
        return res.status(404).json({ message: "Aucun USSD attribué trouvé" });
      }

      // Mise à jour de la date d'attribution pour chaque numéro USSD
      for (const numeroAttribue of numerosAttribues) {
        numeroAttribue.date_attribution = attributionDate;
        await numeroAttribue.save();
      }

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

      const numerosAttribues = await UssdAttribuer.findAll({
        where: { ussd_attribution_id: ussdAttribution.id }
      });

      if (!numerosAttribues.length) {
        return res.status(404).json({ message: "Aucun USSD attribué trouvé" });
      }

      for (const numeroAttribue of numerosAttribues) {
        numeroAttribue.date_attribution = attributionDate;
        await numeroAttribue.save();
      }

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
