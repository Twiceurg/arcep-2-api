const {
  AttributionNumero,
  ZoneUtilisation,
  Client,
  Service,
  USSDAttribution,
  RapportUssd,
  TypeUtilisation,
  UssdAttributionHistorique,
  UssdDecision,
  NumeroAttribue,
  AttributionDecision,
  USSD,
  Utilisation,
  UssdAttribuer,
  Rapport,
  HistoriqueAttribution,
  Renouvellement,
  Category,
  UssdRenouvellement,
  Pnn,
  HistoriqueAttributionNumero,
  DecisionNumero,
  Utilisateur,
  Sequelize
} = require("../../models");
const { Op } = require("sequelize");
const historiqueAttributionController = require("./historiqueAtributionController");

class AttributionNumeroController {
  // 📌 Créer une attribution
  static async createAttribution(req, res) {
    try {
      const {
        type_utilisation_id,
        service_id,
        pnn_id: rawPnnId,
        client_id,
        numero_attribue, // Tableau des numéros attribués
        reference_decision,
        etat_autorisation,
        regle,
        utilisation_id,
        zone_utilisation_id
      } = req.body;

      if (
        !type_utilisation_id ||
        !Array.isArray(type_utilisation_id) ||
        type_utilisation_id.length === 0
      ) {
        return res.json({
          success: false,
          message:
            "Le champ type_utilisation_id est requis et doit être un tableau non vide"
        });
      }

      // Validation : tableau des numéros
      if (
        !numero_attribue ||
        !Array.isArray(numero_attribue) ||
        numero_attribue.length === 0
      ) {
        return res.json({
          success: false,
          message:
            "Le tableau des numéros attribués est requis et doit être un tableau non vide"
        });
      }

      // Vérifier doublons dans le tableau
      const duplicates = numero_attribue.filter(
        (item, index) => numero_attribue.indexOf(item) !== index
      );
      if (duplicates.length > 0) {
        return res.json({
          success: false,
          message: `Les numéros suivants sont en double dans votre requête : ${[
            ...new Set(duplicates)
          ].join(", ")}`
        });
      }

      if (!utilisation_id) {
        return res.json({
          success: false,
          message: "L'attribution du service attribué est requise"
        });
      }

      let validNumbers = [...numero_attribue]; // par défaut, tous les numéros sont valides

      // Initialiser pnn_id avec null par défaut
      let pnn_id = null;

      // Si rawPnnId est défini, tenter de le récupérer
      if (rawPnnId) {
        const pnn = await Pnn.findOne({ where: { id: rawPnnId } });
        if (!pnn) {
          return res.json({
            success: false,
            message: "PNN introuvable"
          });
        }

        pnn_id = rawPnnId;

        // Vérification de la plage autorisée
        for (const numero of numero_attribue) {
          if (numero < pnn.bloc_min || numero > pnn.block_max) {
            return res.json({
              success: false,
              message: `Le numéro ${numero} est en dehors de la plage autorisée du PNN`
            });
          }
        }
      }

      // Vérifier conflits dans NumeroAttribue
      // Préparer la clause WHERE selon le type d'utilisation
      const numeroWhereClause = {
        numero_attribue: { [Op.in]: validNumbers },
        statut: { [Op.ne]: "libre" }
      };

      // Si c'est une attribution USSD (utilisation_id === 15), on filtre aussi par utilisation_id
      const utilisationId = Number(utilisation_id);

      if (!isNaN(utilisationId)) {
        if (utilisationId === 15) {
          numeroWhereClause.utilisation_id = 15;
        } else {
          numeroWhereClause.utilisation_id = { [Op.ne]: 15 };
        }
      }

      const numeroConflicts = await NumeroAttribue.findAll({
        where: numeroWhereClause,
        include: [{ model: AttributionNumero, include: [Client] }]
      });

      // // Vérifier conflits dans UssdAttribuer
      // const ussdConflicts = await UssdAttribuer.findAll({
      //   where: {
      //     ussd_attribue: { [Op.in]: validNumbers },
      //     statut: { [Op.ne]: "libre" }
      //   },
      //   include: [{ model: USSDAttribution, include: [Client] }]
      // });

      const conflicts = [];

      numeroConflicts.forEach((entry) => {
        const clientName =
          entry.AttributionNumero?.Client?.denomination || "client inconnu";
        conflicts.push(
          `Le numéro ${entry.numero_attribue} a déjà été attribué à : ${clientName}`
        );
      });

      // ussdConflicts.forEach((entry) => {
      //   const clientName =
      //     entry.USSDAttribution?.Client?.denomination || "client inconnu";
      //   conflicts.push(
      //     `Le numéro ${entry.ussd_attribue} a déjà été attribué en USSD à : ${clientName}`
      //   );
      // });

      if (conflicts.length > 0) {
        return res.json({ success: false, message: conflicts.join(" ; ") });
      }

      // Création de l'attribution
      const attribution = await AttributionNumero.create({
        // type_utilisation_id,
        service_id,
        pnn_id: pnn_id || null,
        client_id,
        zone_utilisation_id: zone_utilisation_id || null,
        regle,
        reference_decision,
        etat_autorisation: false,
        utilisation_id
      });

      await attribution.setTypeUtilisations(type_utilisation_id);

      // Création des entrées NumeroAttribue
      const numeroAttribueEntries = numero_attribue.map((numero) => ({
        attribution_id: attribution.id,
        numero_attribue: numero,
        zone_utilisation_id: zone_utilisation_id || null,
        utilisation_id,
        pnn_id: pnn_id || null,
        created_at: new Date(),
        updated_at: new Date()
      }));

      const numeroAttribues = await NumeroAttribue.bulkCreate(
        numeroAttribueEntries
      );

      // Historique
      const historiqueEntries = numeroAttribues.map((numeroAttribue) => ({
        attribution_id: attribution.id,
        numero_id: numeroAttribue.id,
        numero: numeroAttribue.numero_attribue,
        date_attribution: new Date(),
        motif: "Attribution initiale",
        utilisateur_id: req.user.id,
        created_at: new Date(),
        updated_at: new Date()
      }));

      await HistoriqueAttributionNumero.bulkCreate(historiqueEntries);

      return res.status(201).json({
        success: true,
        message: "Attribution et numéros créés avec succès",
        attribution
      });
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // 📌 Récupérer toutes les attributions
  static async getAllAttributions(req, res) {
    try {
      const {
        utilisationId,
        serviceId,
        renouveler,
        expirer,
        mois,
        annee,
        startDate: startStr,
        endDate: endStr
      } = req.query;

      const whereConditions = {};
      let startDate, endDate;

      if (utilisationId) {
        whereConditions.utilisation_id = utilisationId;
      }

      if (serviceId) {
        whereConditions["service_id"] = serviceId;
      }

      // ➕ Filtre par startDate et endDate
      if (startStr && endStr) {
        startDate = new Date(startStr);
        endDate = new Date(endStr);
        whereConditions.date_attribution = {
          [Sequelize.Op.gte]: startDate,
          [Sequelize.Op.lte]: endDate
        };
      } else if (mois && annee) {
        startDate = new Date(annee, mois - 1, 1);
        endDate = new Date(annee, mois, 0);
        whereConditions.date_attribution = {
          [Sequelize.Op.gte]: startDate,
          [Sequelize.Op.lte]: endDate
        };
      } else if (annee) {
        startDate = new Date(annee, 0, 1);
        endDate = new Date(annee, 11, 31);
        whereConditions.date_attribution = {
          [Sequelize.Op.gte]: startDate,
          [Sequelize.Op.lte]: endDate
        };
      } else if (mois) {
        const currentYear = new Date().getFullYear();
        startDate = new Date(currentYear, mois - 1, 1);
        endDate = new Date(currentYear, mois, 0);
        whereConditions.date_attribution = {
          [Sequelize.Op.gte]: startDate,
          [Sequelize.Op.lte]: endDate
        };
      }

      const attributions = await AttributionNumero.findAll({
        where: whereConditions,
        order: [["date_attribution", "DESC"]],
        include: [
          { model: Client },
          { model: Utilisation },
          { model: ZoneUtilisation },
          {
            model: AttributionDecision,

            order: [["date_attribution", "DESC"]]
          },
          {
            model: Service,
            include: [{ model: Category }]
          },
          {
            model: TypeUtilisation,
            through: { attributes: [] }
          },
          {
            model: Pnn,
            include: [{ model: Utilisation }]
          },
          {
            model: NumeroAttribue
            // where: {
            //   statut: {
            //     [Op.notIn]: ["Retiré", "Résiliation"]
            //   }
            // }
          },
          { model: Rapport }
        ]
      });

      // 🔁 Fonction métier pour trouver la décision pertinente
      const getDecisionPertinente = (decisions) => {
        if (!decisions || decisions.length === 0) return null;

        // Trier les décisions par date de création décroissante
        const sorted = [...decisions].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        // 1. Résiliation (si présente)
        const resiliation = sorted.find(
          (d) => d.type_decision === "résiliation"
        );
        if (resiliation) return resiliation;

        // 2. Retrait
        const retrait = sorted.find((d) => d.type_decision === "retrait");
        if (retrait) return retrait;

        // 3. Suspension active
        const suspension = sorted.find((d) => d.type_decision === "suspension");
        if (
          suspension?.date_expiration &&
          new Date() < new Date(suspension.date_expiration)
        ) {
          return suspension;
        }

        // 4. La plus récente entre modification et réclamation
        const modifOrRecla = sorted.find(
          (d) =>
            d.type_decision === "modification" ||
            d.type_decision === "reclamation"
        );
        if (modifOrRecla) return modifOrRecla;

        // 5. Renouvellement
        const renouvellement = sorted.find(
          (d) => d.type_decision === "renouvellement"
        );
        if (renouvellement) return renouvellement;

        // 6. Attribution (par défaut)
        return (
          sorted.find((d) => d.type_decision === "attribution") || sorted[0]
        );
      };

      // ➕ Ajout de la décision pertinente à chaque attribution
      let filteredAttributions = attributions.map((attr) => {
        const attrPlain = attr.get({ plain: true });
        const decisionPertinente = getDecisionPertinente(
          attrPlain.AttributionDecisions
        );

        return {
          ...attrPlain,
          decision_pertinente: decisionPertinente
        };
      });
      const filtrageActif =
        utilisationId ||
        serviceId ||
        renouveler === "true" ||
        renouveler === "false" ||
        expirer === "true" ||
        expirer === "false" ||
        mois ||
        annee ||
        startStr ||
        endStr;

      if (filtrageActif) {
        filteredAttributions = filteredAttributions.filter(
          (attr) => attr.decision_pertinente
        );
      }

      // // Ensuite, seulement lors du filtrage :
      // filteredAttributions = filteredAttributions.filter(
      //   (attr) => attr.decision_pertinente // ici on filtre les `null`
      // );

      if (serviceId) {
        const idService = parseInt(serviceId);
        filteredAttributions = filteredAttributions.filter(
          (attr) => attr.Service && attr.Service.id === idService
        );
      }

      if (utilisationId) {
        const idUtilisation = parseInt(utilisationId);
        console.log("Filtrage uniquement par Utilisation.id =", idUtilisation);

        filteredAttributions.forEach((attr, index) => {
          console.log(
            `Attribution #${index}`,
            "Utilisation.id =",
            attr.Utilisation?.id
          );
        });

        filteredAttributions = filteredAttributions.filter((attr) => {
          // On filtre sur Utilisation.id seulement, sans tenir compte de la décision pertinente
          return attr.Utilisation?.id === idUtilisation;
        });
      }

      filteredAttributions = filteredAttributions.filter(
        (attr) => attr.Service && attr.Service.Category.id !== 1
      );

      if (renouveler === "true") {
        filteredAttributions = filteredAttributions.filter(
          (attr) => attr.decision_pertinente?.type_decision === "renouvellement"
        );
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expirer === "true") {
        filteredAttributions = filteredAttributions.filter((attr) => {
          const exp = attr.decision_pertinente.date_expiration;
          if (!exp) return false; // maintenant on est sûr que la décision existe, donc exp doit exister aussi
          const expDate = new Date(exp);
          expDate.setHours(0, 0, 0, 0);
          return expDate < today;
        });
      } else if (expirer === "false") {
        filteredAttributions = filteredAttributions.filter((attr) => {
          const exp = attr.decision_pertinente.date_expiration;
          if (!exp) return false;
          const expDate = new Date(exp);
          expDate.setHours(0, 0, 0, 0);
          return expDate >= today;
        });
      }

      return res.status(200).json(filteredAttributions);
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  static async getAllAttributionsBloc(req, res) {
    try {
      const {
        utilisationId,
        serviceId,
        expirer,
        mois,
        annee,
        startDate: startStr,
        endDate: endStr
      } = req.query;

      const whereConditions = {};
      let startDate, endDate;

      if (utilisationId) {
        whereConditions.utilisation_id = utilisationId;
      }

      if (serviceId) {
        whereConditions["service_id"] = serviceId;
      }

      // ➕ Filtre par startDate et endDate
      if (startStr && endStr) {
        startDate = new Date(startStr);
        endDate = new Date(endStr);
        whereConditions.date_attribution = {
          [Sequelize.Op.gte]: startDate,
          [Sequelize.Op.lte]: endDate
        };
      } else if (mois && annee) {
        startDate = new Date(annee, mois - 1, 1);
        endDate = new Date(annee, mois, 0);
        whereConditions.date_attribution = {
          [Sequelize.Op.gte]: startDate,
          [Sequelize.Op.lte]: endDate
        };
      } else if (annee) {
        startDate = new Date(annee, 0, 1);
        endDate = new Date(annee, 11, 31);
        whereConditions.date_attribution = {
          [Sequelize.Op.gte]: startDate,
          [Sequelize.Op.lte]: endDate
        };
      } else if (mois) {
        const currentYear = new Date().getFullYear();
        startDate = new Date(currentYear, mois - 1, 1);
        endDate = new Date(currentYear, mois, 0);
        whereConditions.date_attribution = {
          [Sequelize.Op.gte]: startDate,
          [Sequelize.Op.lte]: endDate
        };
      }

      const attributions = await AttributionNumero.findAll({
        where: whereConditions,
        order: [["date_attribution", "DESC"]],
        include: [
          { model: Client },
          {
            model: AttributionDecision
          },
          {
            model: Service,
            include: [{ model: Category }]
          },
          {
            model: TypeUtilisation,
            through: { attributes: [] }
          },
          {
            model: Pnn,
            include: [{ model: Utilisation }]
          },
          { model: NumeroAttribue },
          { model: Rapport }
        ]
      });
      const getDecisionPertinente = (decisions) => {
        if (!decisions || decisions.length === 0) return null;

        // Trier les décisions par date de création décroissante
        const sorted = [...decisions].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        // 1. Résiliation (si présente)
        const resiliation = sorted.find(
          (d) => d.type_decision === "résiliation"
        );
        if (resiliation) return resiliation;

        // 2. Retrait
        const retrait = sorted.find((d) => d.type_decision === "retrait");
        if (retrait) return retrait;

        // 3. Suspension active
        const suspension = sorted.find((d) => d.type_decision === "suspension");
        if (
          suspension?.date_expiration &&
          new Date() < new Date(suspension.date_expiration)
        ) {
          return suspension;
        }

        // 4. La plus récente entre modification et réclamation
        const modifOrRecla = sorted.find(
          (d) =>
            d.type_decision === "modification" ||
            d.type_decision === "reclamation"
        );
        if (modifOrRecla) return modifOrRecla;

        // 5. Renouvellement
        const renouvellement = sorted.find(
          (d) => d.type_decision === "renouvellement"
        );
        if (renouvellement) return renouvellement;

        // 6. Attribution (par défaut)
        return (
          sorted.find((d) => d.type_decision === "attribution") || sorted[0]
        );
      };

      let filteredAttributions = attributions.map((attr) => {
        const attrPlain = attr.get({ plain: true });
        const decisionPertinente = getDecisionPertinente(
          attrPlain.AttributionDecisions
        );
        return {
          ...attrPlain,
          decision_pertinente: decisionPertinente
        };
      });

      if (serviceId) {
        filteredAttributions = filteredAttributions.filter(
          (attr) => attr.Service && attr.Service.id === parseInt(serviceId)
        );
      }

      if (utilisationId) {
        filteredAttributions = filteredAttributions.filter(
          (attr) =>
            attr.Pnn &&
            attr.Pnn.Utilisation &&
            attr.Pnn.Utilisation.id === parseInt(utilisationId)
        );
      }

      filteredAttributions = filteredAttributions.filter(
        (attr) => attr.Service && attr.Service.Category.id === 1
      );

      // Nouveau filtre pour les expirations
      if (expirer === "true") {
        filteredAttributions = filteredAttributions.filter(
          (attr) =>
            !attr.decision_pertinente?.date_expiration ||
            new Date(attr.decision_pertinente.date_expiration) < new Date()
        );
      } else if (expirer === "false") {
        filteredAttributions = filteredAttributions.filter(
          (attr) =>
            attr.decision_pertinente?.date_expiration &&
            new Date(attr.decision_pertinente.date_expiration) > new Date()
        );
      }

      return res.status(200).json(filteredAttributions);
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  static async getHistoriqueByAttributionId(req, res) {
    try {
      const { id } = req.params; // id de l'attribution

      const historique = await HistoriqueAttribution.findAll({
        where: { attribution_id: id },
        order: [["created_at", "DESC"]],
        include: [
          {
            model: Utilisateur
          }
        ]
      });

      return res.status(200).json({
        success: true,
        data: historique
      });
    } catch (error) {
      console.error("Erreur récupération historique:", error);
      return res.json({
        success: false,
        message: "Erreur lors de la récupération de l'historique"
      });
    }
  }

  static async getAllHistoriques(req, res) {
    try {
      const historiques = await HistoriqueAttributionNumero.findAll({
        order: [["created_at", "DESC"]],
        include: [
          {
            model: AttributionNumero,
            include: [
              { model: Client },
              { model: Service },
              {
                model: TypeUtilisation,
                through: { attributes: [] }
              },
              { model: Pnn },
              { model: Utilisation },
              { model: NumeroAttribue },
              { model: Rapport },
              { model: Renouvellement },
              { model: AttributionDecision },
              { model: HistoriqueAttribution }
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

      // 🛠 Traitement des historiques pour ajouter la décision pertinente
      const historiquesWithDecision = historiques.map((histo) => {
        const histoPlain = histo.get({ plain: true });
        const attribution = histoPlain.AttributionNumero;

        if (attribution?.AttributionDecisions) {
          const decisionPertinente = getDecisionPertinente(
            attribution.AttributionDecisions
          );
          histoPlain.AttributionNumero.decision_pertinente = decisionPertinente;
        }

        return histoPlain;
      });

      return res.status(200).json({
        success: true,
        data: historiquesWithDecision
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des historiques:", error);
      return res.json({
        success: false,
        message: "Erreur lors de la récupération des historiques"
      });
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
          {
            model: TypeUtilisation,
            through: { attributes: [] }
          },
          {
            model: Pnn,
            include: [{ model: Utilisation }]
          },
          {
            model: NumeroAttribue,
            where: {
              statut: {
                [Op.notIn]: ["Retiré", "Résiliation","libre"]
              }
            }
          }
        ]
      });

      if (!attribution) {
        return res.json({ success: false, message: "Attribution non trouvée" });
      }

      return res.status(200).json(attribution);
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // 📌 Mettre à jour une attribution
  static async updateAttribution(req, res) {
    try {
      const { id } = req.params;
      const { type_utilisation_id, motif, reference_decision } = req.body;

      // Vérification de type_utilisation_id
      if (
        !type_utilisation_id ||
        !Array.isArray(type_utilisation_id) ||
        type_utilisation_id.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Le champ type_utilisation_id est requis et doit être un tableau non vide"
        });
      }

      // Récupération des fichiers
      const fichier = req.file || (req.files?.fichier?.[0] ?? null);
      const fichierUrl = fichier ? `/uploads/${fichier.filename}` : null;

      const decisionFile = req.files?.decision_file_url?.[0] ?? null;
      const decisionFileUrl = decisionFile
        ? `/uploads/${decisionFile.filename}`
        : null;

      // Vérification de l'existence de l'attribution
      const attribution = await AttributionNumero.findByPk(id, {
        include: [{ model: AttributionDecision }]
      });

      if (!attribution) {
        return res.json({ success: false, message: "Attribution non trouvée" });
      }

      const firstAttributionDecision = attribution.AttributionDecisions?.find(
        (decision) => decision.type_decision === "attribution"
      );
      if (
        !firstAttributionDecision ||
        !firstAttributionDecision.date_attribution
      ) {
        return res.json({
          success: false,
          message:
            "Aucune décision de type 'attribution' trouvée avec une date valide."
        });
      }

      // Récupération de la date de début existante
      const dateDebut = firstAttributionDecision.date_attribution;
      if (!dateDebut) {
        return res.json({
          success: false,
          message: "La date de l'attribution est manquante."
        });
      }

      // Durée et date de fin
      const dureeSuspension = firstAttributionDecision.duree_utilisation;
      const dateFinSuspension = new Date(dateDebut);
      dateFinSuspension.setMonth(
        dateFinSuspension.getMonth() + dureeSuspension
      );

      // Mise à jour de l'attribution
      attribution.type_utilisation_id = type_utilisation_id;
      await attribution.setTypeUtilisations(type_utilisation_id);
      await attribution.save();

      // const historiqueEntries = numeroAttribues.map((numeroAttribue) => ({
      //   attribution_id: attribution.id,
      //   numero_id: numeroAttribue.id,
      //   numero: numeroAttribue.numero_attribue,
      //   date_attribution: new Date(),
      //   motif: motif || "Reclamation de l'attribution",
      //   utilisateur_id: req.user.id,
      //   created_at: new Date(),
      //   updated_at: new Date()
      // }));

      // await HistoriqueAttributionNumero.bulkCreate(historiqueEntries);

      // Création de l’historique
      const historique = await HistoriqueAttribution.create({
        attribution_id: attribution.id,
        reference_modification: reference_decision ?? null,
        motif: motif || "Modification de l'attribution",
        utilisateur_id: req.user.id,
        type_modification: "modification",
        date_debut: dateDebut,
        duree_suspension: dureeSuspension,
        date_fin_suspension: dateFinSuspension,
        appliquee: false,
        fichier: fichierUrl
      });

      req.body.historiqueId = historique.id;
      req.body.date_attribution = dateDebut;
      req.body.duree_utilisation = null;
      req.body.reference_decision = reference_decision;
      req.body.decision_file_url = decisionFileUrl;
      // Appel à assignReference comme demandé
      return await historiqueAttributionController.assignReference(req, res);

      return res.status(200).json({
        success: true,
        message: "Attribution mise à jour avec succès",
        attribution
      });
    } catch (error) {
      console.error("Erreur dans updateAttribution:", error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // 📌 Mettre à jour une attribution en faisant la reclamation
  static async reclamerAttribution(req, res) {
    try {
      const { id } = req.params;
      const {
        type_utilisation_id,
        service_id,
        pnn_id,
        client_id,
        zone_utilisation_id,
        numero_attribue,
        regle,
        utilisation_id,
        motif,
        reference_decision,
        dateDebut
      } = req.body;

      const fichierUrl = req.files?.fichier
        ? `/uploads/${req.files.fichier[0].filename}`
        : null;

      const decisionFileUrl = req.files?.decision_file_url
        ? `/uploads/${req.files.decision_file_url[0].filename}`
        : null;

      const attribution = await AttributionNumero.findByPk(id, {
        include: [
          {
            model: AttributionDecision
          },
          {
            model: Service,
            include: [Category]
          }
        ]
      });

      const categoryId = attribution.Service?.Category?.id;

      if (!attribution) {
        return res.json({ success: false, message: "Attribution non trouvée" });
      }

      if (
        !type_utilisation_id ||
        !Array.isArray(type_utilisation_id) ||
        type_utilisation_id.length === 0
      ) {
        return res.json({
          success: false,
          message:
            "Le champ type_utilisation_id est requis et doit être un tableau non vide"
        });
      }

      // Durée d'utilisation existante, on utilise la valeur actuelle
      const dureeSuspension =
        attribution.AttributionDecision?.duree_utilisation || 12;

      const dateDebutObj = new Date(dateDebut);

      const dateFinSuspension = new Date(dateDebutObj);
      dateFinSuspension.setMonth(dateDebutObj.getMonth() + dureeSuspension);

      const pnn = await Pnn.findOne({ where: { id: pnn_id } });
      if (!pnn) {
        return res.json({ success: false, message: "PNN introuvable" });
      }

      // Récupérer tous les numéros déjà attribués dans la base, quel que soit le statut
      // Clause WHERE adaptée à l'utilisation
      const numeroAttribueWhere = {
        numero_attribue: { [Op.in]: numero_attribue }
      };

      const utilisationId = Number(utilisation_id);

      if (!isNaN(utilisationId)) {
        if (utilisationId === 15) {
          numeroAttribueWhere.utilisation_id = 15;
        } else {
          numeroAttribueWhere.utilisation_id = { [Op.ne]: 15 };
        }
      }

      const existingNumbers = await NumeroAttribue.findAll({
        where: numeroAttribueWhere
      });

      // Nums déjà attribués à cette attribution
      const existingAssignedNumbers = existingNumbers.filter(
        (num) => num.attribution_id === attribution.id
      );

      // Nouveaux numéros à ajouter
      const numbersToAdd = numero_attribue.filter(
        (numero) =>
          !existingAssignedNumbers
            .map((num) => num.numero_attribue)
            .includes(numero)
      );

      // Numéros en conflit (attribués ailleurs)
      const conflictNumbers = existingNumbers
        .filter((num) => num.attribution_id !== attribution.id)
        .map((num) => num.numero_attribue);

      if (conflictNumbers.length > 0) {
        return res.json({
          success: false,
          message: `Les numéros suivants sont déjà attribués à une autre attribution: ${conflictNumbers.join(
            ", "
          )}`
        });
      }

      // Mise à jour de l'attribution
      attribution.type_utilisation_id = type_utilisation_id;
      attribution.service_id = service_id;
      attribution.zone_utilisation_id = zone_utilisation_id || null;
      attribution.pnn_id = pnn_id || null;
      attribution.client_id = client_id;
      attribution.regle = regle;
      attribution.utilisation_id = utilisation_id;
      await attribution.save();

      await attribution.setTypeUtilisations(type_utilisation_id);

      // Mettre à jour le statut des numéros retirés au lieu de les supprimer
      await NumeroAttribue.update(
        { statut: "libre" },
        {
          where: {
            attribution_id: attribution.id,
            numero_attribue: { [Op.notIn]: numero_attribue },
            statut: { [Op.ne]: "libre" }
          }
        }
      );

      const typeModification =
        categoryId === 1 ? "modification" : "reclamation";

      // Appliquer le motif dynamique aussi
      const motifFinal =
        motif ||
        (categoryId === 1
          ? "Modification de l'attribution"
          : "Reclamation de l'attribution");

      // Ajouter les nouveaux numéros attribués
      const numeroAttribueEntries = numbersToAdd.map((numero) => ({
        attribution_id: attribution.id,
        zone_utilisation_id: zone_utilisation_id || null,
        utilisation_id,
        pnn_id: pnn_id || null,
        numero_attribue: numero,
        statut: "attribue", // préciser le statut actif pour les nouveaux
        created_at: new Date(),
        updated_at: new Date()
      }));

      const numeroAttribues = await NumeroAttribue.bulkCreate(
        numeroAttribueEntries
      );

      const historiqueEntries = numeroAttribues.map((numeroAttribue) => ({
        attribution_id: attribution.id,
        numero_id: numeroAttribue.id,
        numero: numeroAttribue.numero_attribue,
        date_attribution: new Date(),
        motif: motifFinal,
        utilisateur_id: req.user.id,
        created_at: new Date(),
        updated_at: new Date()
      }));

      await HistoriqueAttributionNumero.bulkCreate(historiqueEntries);

      const historique = await HistoriqueAttribution.create({
        attribution_id: attribution.id,
        reference_modification: null,
        motif: motifFinal,
        utilisateur_id: req.user.id,
        type_modification: typeModification,
        date_debut: dateDebut,
        duree_suspension: dureeSuspension,
        date_fin_suspension: dateFinSuspension,
        appliquee: false,
        fichier: fichierUrl
      });

      req.body.historiqueId = historique.id;
      req.body.date_attribution = dateDebut;
      req.body.duree_utilisation = null;
      req.body.reference_decision = reference_decision;
      req.body.decision_file_url = decisionFileUrl;
      req.body.numeros_selectionnes = numero_attribue;
      // Appel à assignReference comme demandé
      return await historiqueAttributionController.assignReference(req, res);
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // 📌 Supprimer une attribution
  static async deleteAttribution(req, res) {
    try {
      const { id } = req.params;

      const attribution = await AttributionNumero.findByPk(id);
      if (!attribution) {
        return res.json({ success: false, message: "Attribution non trouvée" });
      }

      await attribution.destroy();
      return res
        .status(200)
        .json({ message: "Attribution supprimée avec succès" });
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // 📌 Récupérer tous les numéros attribués pour un PNN
  static async getAssignedNumbersByPnn(req, res) {
    try {
      const { pnn_id } = req.params;

      if (!pnn_id) {
        return res.json({ success: false, error: "PNN ID est requis." });
      }

      // Recherche des attributions pour ce PNN avec état autorisation true
      const attributions = await AttributionNumero.findAll({
        where: {
          pnn_id
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
          statut: {
            [Op.ne]: "libre" // Vérifier que le statut est différent de "libre"
          }
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
      return res.json({ success: false, error: "Erreur interne du serveur." });
    }
  }

  static async getAssignedNumbersByUssd(req, res) {
    try {
      const attributions = await AttributionNumero.findAll({
        where: {
          utilisation_id: 15
        },
        attributes: ["id"]
      });

      if (!attributions || attributions.length === 0) {
        return res.json({ success: false }); // Pas d'attributions
      }

      const attributionIds = attributions.map((a) => a.id);

      const assignedNumbers = await NumeroAttribue.findAll({
        where: {
          attribution_id: { [Op.in]: attributionIds },
          statut: { [Op.ne]: "libre" }
        },
        attributes: ["numero_attribue"]
      });

      if (!assignedNumbers || assignedNumbers.length === 0) {
        return res.json({ success: false }); // Pas de numéros attribués
      }

      return res.json({ success: true }); // Succès
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des numéros USSD attribués :",
        error
      );
      return res.json({ success: false }); // Erreur = échec
    }
  }

  // 📌 Récupérer toutes les attributions d'un client par son ID
  static async getAttributionByClientId(req, res) {
    try {
      const { client_id } = req.params;

      if (!client_id) {
        return res.json({ success: false, message: "Client ID est requis" });
      }

      // Attributions classiques
      const attributions = await AttributionNumero.findAll({
        where: { client_id },
        include: [
          { model: Service },
          {
            model: TypeUtilisation,
            through: { attributes: [] }
          },
          {
            model: Pnn,
            include: [{ model: Utilisation }]
          },
          { model: NumeroAttribue }
        ]
      });

      // Vérifie s’il y a au moins une attribution
      if (!attributions || attributions.length === 0) {
        return res.json({
          success: false,
          message: "Aucune attribution trouvée pour ce client"
        });
      }

      // Retourne les deux blocs
      return res.json({
        success: true,
        attributionsClassiques: attributions,
        attributionsUSSD: ussdAttributions
      });
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
      const file = req.file;

      // Vérifier si l'attribution existe avec son service
      const attribution = await AttributionNumero.findByPk(id, {
        include: [{ model: Service, include: [{ model: Category }] }]
      });

      if (!attribution) {
        return res.json({ success: false, message: "Attribution non trouvée" });
      }

      // Vérifier si le service associé a category_id = 1
      const categoryId =
        attribution.Service && attribution.Service.Category
          ? attribution.Service.Category.id
          : null;

      console.log("Category ID:", categoryId);

      // Vérifier si la référence est fournie
      if (!reference_decision) {
        return res.json({
          success: false,
          message: "La référence est requise"
        });
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
          return res.json({
            success: false,
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

        // Mise à jour de la date d'attribution pour l'attribution principale
        attribution.date_attribution = attributionDate;
        await attribution.save();

        // Trouver tous les numéros attribués liés à l'attribution
        const numerosAttribues = await NumeroAttribue.findAll({
          where: { attribution_id: attribution.id }
        });

        if (!numerosAttribues.length) {
          return res.json({
            success: false,
            message: "Aucun numéro attribué trouvé"
          });
        }

        // Mise à jour de la date d'attribution pour chaque numéro
        for (const numeroAttribue of numerosAttribues) {
          numeroAttribue.date_attribution = attributionDate;
          await numeroAttribue.save();
        }

        // Calcul de la date d'expiration
        dateExpiration = new Date(attributionDate);
        dateExpiration.setMonth(dateExpiration.getMonth() + dureeEnMois);
      }

      // Mise à jour de la date d'attribution pour l'attribution principale si catégorie est 1
      attribution.date_attribution = attributionDate;
      await attribution.save();

      // Création de la décision d'attribution
      const attributionDecision = await AttributionDecision.create({
        attribution_id: attribution.id, // L'ID de l'attribution
        reference_decision, // La référence
        date_attribution: attributionDate,
        date_expiration: dateExpiration, // Peut être `null` si category_id = 1
        duree_utilisation: categoryId === 1 ? null : duree_utilisation,
        etat_autorisation: true,
        fichier: `/uploads/${file.filename}`,
        type_decision: "attribution"
      });

      // Trouver à nouveau tous les numéros attribués liés à l'attribution
      const updatedNumerosAttribues = await NumeroAttribue.findAll({
        where: { attribution_id: attribution.id }
      });

      if (!updatedNumerosAttribues.length) {
        return res.json({
          success: false,
          message: "Aucun numéro attribué trouvé"
        });
      }

      // Lier chaque numéro à la décision via la table pivot
      for (const numeroAttribue of updatedNumerosAttribues) {
        await DecisionNumero.create({
          numero_attribue_id: numeroAttribue.id,
          decision_id: attributionDecision.id
        });
      }

      // Mise à jour de la date d'attribution pour chaque numéro
      for (const numeroAttribue of updatedNumerosAttribues) {
        numeroAttribue.date_attribution = attributionDate;
        await numeroAttribue.save();
      }

      // Réponse si l'attribution et la décision ont été bien mises à jour
      return res.status(200).json({
        success: true,
        message: "Référence assignée et attribution mise à jour avec succès",
        attributionDecision
      });
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  static async assignReferenceDeReclamtion(req, res) {
    try {
      const { id } = req.params;
      const { reference_decision, date_attribution, duree_utilisation } =
        req.body;
      const file = req.file;

      if (!file) {
        return res.json({ message: "Le fichier est requis" });
      }

      // Vérifier si l'attribution existe avec son service
      const attribution = await AttributionNumero.findByPk(id, {
        include: [{ model: Service, include: [{ model: Category }] }]
      });

      if (!attribution) {
        return res.json({ success: false, message: "Attribution non trouvée" });
      }

      // Vérifier si le service associé a category_id = 1
      const categoryId =
        attribution.Service && attribution.Service.Category
          ? attribution.Service.Category.id
          : null;

      console.log("Category ID:", categoryId);

      // Vérifier si la référence est fournie
      if (!reference_decision) {
        return res.json({
          success: false,
          message: "La référence est requise"
        });
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
          return res.json({
            success: false,
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

      const numeroAttribue = await NumeroAttribue.findOne({
        where: { attribution_id: attribution.id }
      });

      if (!numeroAttribue) {
        return res.json({
          success: false,
          message: "Numéro attribué non trouvé"
        });
      }

      numeroAttribue.statut = "reservation";
      await numeroAttribue.save();

      // Création de la décision d'attribution
      const attributionDecision = await AttributionDecision.create({
        attribution_id: attribution.id, // L'ID de l'attribution
        reference_decision, // La référence
        date_attribution: attributionDate,
        date_expiration: dateExpiration, // Peut être `null` si category_id = 1
        duree_utilisation: categoryId === 1 ? null : duree_utilisation,
        etat_autorisation: true,
        fichier: `/uploads/${file.filename}`,
        type_decision: "reservation"
      });

      await DecisionNumero.create({
        numero_attribue_id: numeroAttribue.id,
        decision_id: attributionDecision.id
      });

      // Réponse si l'attribution et la décision ont été bien mises à jour
      return res.status(200).json({
        success: true,
        message: "Référence assignée et reservation effectuer avec succès",
        attributionDecision
      });
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // *********************************************************************************************************************************

  // static async assignReference(req, res) {
  //   try {
  //     const { id } = req.params; // ID de l'attribution
  //     const { reference_decision, date_attribution, duree_utilisation } =
  //       req.body;

  //     // Vérifier si l'attribution existe
  //     const attribution = await AttributionNumero.findByPk(id, {
  //       include: [{ model: Service, include: [{ model: Category }] }]
  //     });

  //     if (!attribution) {
  //       return res.status(404).json({ message: "Attribution non trouvée" });
  //     }

  //     // Vérifier si l'attribution dispose déjà d'un HistoriqueAttribution
  //     const historique = await HistoriqueAttribution.findOne({
  //       where: { attribution_id: attribution.id },
  //       order: [["created_at", "DESC"]] // On prend le dernier historique en date
  //     });

  //     if (historique) {
  //       // Cas 1 : Historique existant, on récupère l'id du dernier HistoriqueAttribution
  //       const historique_id = historique.id;

  //       // Mise à jour de l'historique (date_attribution, duree_utilisation si fournis)
  //       if (date_attribution) {
  //         historique.date_debut = new Date(date_attribution);
  //       }
  //       if (duree_utilisation) {
  //         historique.duree_suspension = duree_utilisation; // Mettre à jour la durée
  //       }

  //       // Recalculer la date_fin_suspension avec la nouvelle durée
  //       const dureeMatch = duree_utilisation
  //         ? duree_utilisation.match(/^(\d+)\s*(mois|ans)$/i)
  //         : null;
  //       let dureeEnMois = 0;

  //       if (dureeMatch) {
  //         dureeEnMois = parseInt(dureeMatch[1], 10);
  //         if (dureeMatch[2].toLowerCase() === "ans") {
  //           dureeEnMois *= 12; // Convertir en mois si c'est en années
  //         }
  //       }

  //       // Calculer la nouvelle date_fin_suspension si la durée est fournie
  //       if (dureeEnMois > 0) {
  //         let date_fin_suspension = new Date(historique.date_attribution);
  //         date_fin_suspension.setMonth(
  //           date_fin_suspension.getMonth() + dureeEnMois
  //         );

  //         // Mettre à jour la date_fin_suspension dans HistoriqueAttribution
  //         historique.date_fin_suspension = date_fin_suspension;
  //       }

  //       const numeroAttribue = await NumeroAttribue.findOne({
  //         where: { attribution_id: attribution.id }
  //       });

  //       if (!numeroAttribue) {
  //         return res
  //           .status(404)
  //           .json({ message: "Numéro attribué non trouvé" });
  //       }

  //       numeroAttribue.statut = "suspendu"; // Modifier le statut
  //       await numeroAttribue.save();

  //       historique.appliquee = true; // Si applicable (si vous souhaitez marquer l'historique comme appliqué)
  //       historique.reference_modification = reference_decision;
  //       // Sauvegarder l'historique mis à jour
  //       await historique.save();

  //       // Mise à jour de la table AttributionDecision
  //       const attributionDecision = await AttributionDecision.create({
  //         attribution_id: attribution.id, // L'ID de l'attribution
  //         reference_decision, // La référence
  //         date_attribution: historique.date_debut, // Utilisation de la date_attribution de l'historique
  //         date_expiration: historique.date_fin_suspension, // Utilisation de date_fin_suspension calculée
  //         duree_utilisation: historique.duree_suspension, // Utilisation de la durée de l'historique
  //         etat_autorisation: true
  //       });

  //       // Réponse si l'attribution et la décision ont été bien mises à jour
  //       return res.status(200).json({
  //         success: true,
  //         message: "Référence assignée et historique mis à jour avec succès",
  //         attributionDecision
  //       });
  //     } else {
  //       // Cas 2 : Pas d'historique existant, traitement normal sans HistoriqueAttribution
  //       const { reference_decision, date_attribution, duree_utilisation } =
  //         req.body;

  //       // Vérifier si la référence est fournie
  //       if (!reference_decision) {
  //         return res.json({ message: "La référence est requise" });
  //       }

  //       // Vérifier si la date d'attribution est fournie
  //       const attributionDate = date_attribution
  //         ? new Date(date_attribution)
  //         : new Date();

  //       let dateExpiration = null; // Initialiser la date d'expiration par défaut

  //       const categoryId =
  //         attribution.Service && attribution.Service.Category
  //           ? attribution.Service.Category.id
  //           : null;

  //       if (categoryId !== 1) {
  //         // Si la catégorie N'EST PAS 1, on prend en compte la durée
  //         const match = duree_utilisation
  //           ? duree_utilisation.match(/^(\d+)\s*(mois|ans)$/i)
  //           : null;

  //         if (!match) {
  //           return res.json({
  //             message:
  //               "Durée invalide. Veuillez spécifier la durée (ex: 3 mois ou 2 ans)."
  //           });
  //         }

  //         const duree = parseInt(match[1], 10);
  //         const unite = match[2].toLowerCase();
  //         let dureeEnMois = duree;

  //         if (unite === "ans") {
  //           dureeEnMois *= 12; // Convertir en mois si c'est en années
  //         }

  //         // Calcul de la date d'expiration
  //         dateExpiration = new Date(attributionDate);
  //         dateExpiration.setMonth(dateExpiration.getMonth() + dureeEnMois);
  //       }

  //       // historique.appliquee = true; // Si applicable (si vous souhaitez marquer l'historique comme appliqué)
  //       // historique.reference_decision = reference_decision; // Assigner la référence de décision

  //       // // Sauvegarder l'historique mis à jour
  //       // await historique.save();

  //       // Création de la décision d'attribution
  //       const attributionDecision = await AttributionDecision.create({
  //         attribution_id: attribution.id, // L'ID de l'attribution
  //         reference_decision, // La référence
  //         date_attribution: attributionDate,
  //         date_expiration: dateExpiration, // Peut être `null` si category_id = 1
  //         duree_utilisation: categoryId === 1 ? null : duree_utilisation,
  //         etat_autorisation: true
  //       });

  //       // Réponse si l'attribution et la décision ont été bien mises à jour
  //       return res.status(200).json({
  //         success: true,
  //         message: "Référence assignée et attribution mise à jour avec succès",
  //         attributionDecision
  //       });
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     return res.status(500).json({ message: "Erreur interne du serveur" });
  //   }
  // }

  static async appliquerSuspension(req, res) {
    try {
      console.log(req.body); // Ajoutez cette ligne pour voir ce qui est reçu

      const utilisateurId = req.user.id;

      const { attributionId, motif, dateDebut, dureeSuspension } =
        req.body.attributionId;

      // Vérification des données obligatoires
      if (!attributionId || !motif || !dateDebut || !dureeSuspension) {
        return res.json({
          success: false,
          message:
            "Données manquantes : attributionId, motif, dateDebut, ou dureeSuspension."
        });
      }

      // Vérification de la validité de la date de début
      const dateDebutObj = new Date(dateDebut);
      if (isNaN(dateDebutObj.getTime())) {
        return res.json({ message: "Date de début invalide." });
      }

      // Vérification et extraction de la durée de suspension (mois ou années)
      const match = dureeSuspension.match(/^(\d+)\s*(mois|ans)$/i);
      if (!match) {
        return res.json({
          success: false,
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

      // Calcul de la date de fin de suspension
      const dateFinSuspension = new Date(dateDebutObj);
      dateFinSuspension.setMonth(dateDebutObj.getMonth() + dureeEnMois);

      // Créer l'entrée d'historique de suspension
      const historique = await HistoriqueAttribution.create({
        attribution_id: attributionId,
        reference_modification: null, // Reference initiale
        motif: motif,
        utilisateur_id: utilisateurId,
        type_modification: "suspension", // Type de modification
        date_debut: dateDebut, // Date de début de la suspension
        duree_suspension: dureeSuspension, // Durée de la suspension (en mois ou années)
        date_fin_suspension: dateFinSuspension, // Date de fin calculée
        appliquee: false // Marquer comme non appliquée
      });

      // Marquer l'attribution comme suspendue
      // await AttributionNumero.update(
      //   { statut: "suspendu" }, // Le statut devient suspendu
      //   { where: { id: attributionId } }
      // );

      // Répondre avec succès
      return res.status(200).json({
        success: true,
        message:
          "Suspension appliquée avec succès, référence de décision à appliquer ultérieurement.",
        historique: historique
      });
    } catch (error) {
      console.error("Erreur lors de l'application de la suspension :", error);
      return res.json({
        success: false,
        message: "Erreur interne du serveur."
      });
    }
  }

  static async getAttributionDecisions(req, res) {
    const { id } = req.params;

    if (!id) {
      return res.json({
        success: false,
        message: "L'identifiant de l'attribution est requis."
      });
    }

    try {
      const decisions = await AttributionDecision.findAll({
        where: { attribution_id: id },
        include: [
          {
            model: NumeroAttribue,
            as: "numeros", // Doit correspondre à l'alias dans les associations
            through: { attributes: [] } // Ne retourne pas les champs de la table pivot
          }
        ],
        order: [["date_attribution", "DESC"]]
      });

      if (!decisions || decisions.length === 0) {
        return res.json({
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
      return res.json({
        success: false,
        message: "Erreur serveur lors de la récupération des décisions."
      });
    }
  }
}

module.exports = AttributionNumeroController;
