const {
  AttributionNumero,
  Client,
  Service,
  TypeUtilisation,
  NumeroAttribue,
  AttributionDecision,
  Utilisation,
  Rapport,
  HistoriqueAttribution,
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
        regle,
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
        regle,
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
      const { utilisationId, serviceId, renouveler, expirer } = req.query;

      const whereConditions = {};

      if (utilisationId) {
        whereConditions.utilisation_id = utilisationId;
      }

      if (serviceId) {
        whereConditions["service_id"] = serviceId;
      }

      const attributions = await AttributionNumero.findAll({
        where: whereConditions,
        include: [
          { model: Client },
          {
            model: AttributionDecision,
            order: [["created_at", "DESC"]]
          },
          {
            model: Service,
            include: [{ model: Category }]
          },
          { model: TypeUtilisation },
          {
            model: Pnn,
            include: [{ model: Utilisation }]
          },
          { model: NumeroAttribue },
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

        // Vérifier s'il y a une décision de retrait
        const retrait = sorted.find((d) => d.type_decision === "retrait");
        if (retrait) return retrait;

        // Vérifier si une suspension est active
        const suspension = sorted.find((d) => d.type_decision === "suspension");
        if (
          suspension?.date_expiration &&
          new Date() < new Date(suspension.date_expiration)
        ) {
          return suspension; // Si la suspension est active, on retourne la suspension
        }

        // Vérifier si une décision de modification ou réclamation existe après un renouvellement
        const modifOrRecla = sorted.find(
          (d) =>
            (d.type_decision === "modification" ||
              d.type_decision === "reclamation") &&
            new Date(d.created_at) > new Date(sorted[0].created_at) // Vérifie que la modification/reclamation est plus récente que le renouvellement
        );
        if (modifOrRecla) {
          return modifOrRecla; // Retourner la modification ou réclamation la plus récente
        }

        // Vérifier si une décision de renouvellement existe
        const renouvellement = sorted.find(
          (d) => d.type_decision === "renouvellement"
        );
        if (renouvellement) {
          return renouvellement; // Retourner le renouvellement
        }

        // Retourner la première attribution si aucune autre décision n'est pertinente
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
        (attr) => attr.Service && attr.Service.Category.id !== 1
      );

      if (renouveler === "true") {
        filteredAttributions = filteredAttributions.filter(
          (attr) => attr.decision_pertinente?.type_decision === "renouvellement"
        );
      }

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
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }

  static async getAllAttributionsBloc(req, res) {
    try {
      const { utilisationId, serviceId } = req.query;

      const whereConditions = {};

      // Filtrer par type d'utilisation si spécifié
      if (utilisationId) {
        whereConditions.utilisation_id = utilisationId;
      }

      // Filtrer par service si spécifié
      if (serviceId) {
        whereConditions["service_id"] = serviceId; // On filtre les attributions par ServiceId ici
      }

      // Inclure les modèles liés
      const attributions = await AttributionNumero.findAll({
        where: whereConditions,
        include: [
          { model: Client },
          {
            model: AttributionDecision,
            limit: 1,
            order: [["date_attribution", "DESC"]]
          },
          {
            model: Service,
            include: [{ model: Category }] // Inclure `Category` pour pouvoir filtrer après
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

      // Filtrer les attributions par ID de service si `serviceId` est spécifié
      let filteredAttributions = attributions;

      if (serviceId) {
        filteredAttributions = filteredAttributions.filter(
          (attr) => attr.Service && attr.Service.id === parseInt(serviceId)
        );
      }

      // Filtrer par type d'utilisation si spécifié
      if (utilisationId) {
        filteredAttributions = filteredAttributions.filter(
          (attr) =>
            attr.Pnn &&
            attr.Pnn.Utilisation &&
            attr.Pnn.Utilisation.id === parseInt(utilisationId)
        );
      }

      // Filtrer les attributions qui ont une catégorie spécifique (par exemple, catégorie 1)
      filteredAttributions = filteredAttributions.filter(
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
        numero_attribue,
        reference_decision,
        regle,
        utilisation_id,
        motif // ✅ Ajout du motif
      } = req.body;

      const file = req.file; // ✅ Récupération du fichier

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

      // Vérifier si l'attribution existe
      const attribution = await AttributionNumero.findByPk(id, {
        include: [{ model: AttributionDecision }] // Inclure les décisions
      });

      if (!attribution) {
        return res.status(404).json({ message: "Attribution non trouvée" });
      }

      // ✅ Récupération de la durée d'utilisation depuis AttributionDecision
      const dureeSuspension =
        attribution.AttributionDecision?.duree_utilisation; // Par défaut 12 mois
      const dateDebut = new Date(); // Date actuelle
      const dateFinSuspension = new Date(dateDebut);
      dateFinSuspension.setMonth(dateDebut.getMonth() + dureeSuspension);

      // Vérifier si le PNN existe
      const pnn = await Pnn.findOne({ where: { id: pnn_id } });
      if (!pnn) {
        return res
          .status(404)
          .json({ success: false, message: "PNN introuvable" });
      }
      console.log("PNN:", pnn);
      console.log("Bloc Min:", pnn.bloc_min);
      console.log("Bloc Max:", pnn.block_max);
      // Vérifier que chaque numéro est valide
      for (const numero of numero_attribue) {
        if (numero < pnn.bloc_min || numero > pnn.block_max) {
          return res.status(400).json({
            success: false,
            message: `Le numéro ${numero} est en dehors de la plage autorisée`
          });
        }
      }

      // Vérifier si un numéro appartient déjà à l'attribution actuelle
      const existingNumbers = await NumeroAttribue.findAll({
        where: { numero_attribue: { [Op.in]: numero_attribue } }
      });

      // Liste des numéros déjà attribués à cette attribution
      const existingAssignedNumbers = existingNumbers.filter(
        (num) => num.attribution_id === attribution.id
      );

      // Liste des nouveaux numéros
      const numbersToAdd = numero_attribue.filter(
        (numero) =>
          !existingAssignedNumbers
            .map((num) => num.numero_attribue)
            .includes(numero)
      );

      // Vérifier si les nouveaux numéros sont déjà attribués ailleurs
      const conflictNumbers = existingNumbers
        .filter((num) => num.attribution_id !== attribution.id)
        .map((num) => num.numero_attribue);

      if (conflictNumbers.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Les numéros suivants sont déjà attribués à une autre attribution: ${conflictNumbers.join(
            ", "
          )}`
        });
      }

      // Mise à jour de l'attribution
      attribution.type_utilisation_id = type_utilisation_id;
      attribution.service_id = service_id;
      attribution.pnn_id = pnn_id;
      attribution.client_id = client_id;
      attribution.regle = regle;
      attribution.utilisation_id = utilisation_id;
      await attribution.save();

      // Supprimer les anciens numéros non utilisés
      await NumeroAttribue.destroy({
        where: {
          attribution_id: attribution.id,
          numero_attribue: { [Op.notIn]: numero_attribue }
        }
      });

      // Ajouter les nouveaux numéros attribués
      const numeroAttribueEntries = numbersToAdd.map((numero) => ({
        attribution_id: attribution.id,
        numero_attribue: numero,
        created_at: new Date(),
        updated_at: new Date()
      }));

      await NumeroAttribue.bulkCreate(numeroAttribueEntries);

      const fichierUrl = file ? `/uploads/${file.filename}` : null;

      await HistoriqueAttribution.create({
        attribution_id: attribution.id,
        reference_modification: null,
        motif: motif || "Modification de l'attribution",
        utilisateur_id: req.user.id,
        type_modification: "modification",
        date_debut: dateDebut,
        duree_suspension: dureeSuspension,
        date_fin_suspension: dateFinSuspension,
        appliquee: false,
        fichier: fichierUrl
      });

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

  // 📌 Mettre à jour une attribution en faisant la reclamation
  static async reclamerAttribution(req, res) {
    try {
      const { id } = req.params;
      const {
        type_utilisation_id,
        service_id,
        pnn_id,
        client_id,
        numero_attribue,
        regle,
        utilisation_id,
        motif // ✅ Ajout du motif
      } = req.body;

      const file = req.file; // ✅ Récupération du fichier

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

      // Vérifier si l'attribution existe
      const attribution = await AttributionNumero.findByPk(id, {
        include: [{ model: AttributionDecision }] // Inclure les décisions
      });

      if (!attribution) {
        return res.status(404).json({ message: "Attribution non trouvée" });
      }

      // ✅ Récupération de la durée d'utilisation depuis AttributionDecision
      const dureeSuspension =
        attribution.AttributionDecision?.duree_utilisation; // Par défaut 12 mois
      const dateDebut = new Date(); // Date actuelle
      const dateFinSuspension = new Date(dateDebut);
      dateFinSuspension.setMonth(dateDebut.getMonth() + dureeSuspension);

      // Vérifier si le PNN existe
      const pnn = await Pnn.findOne({ where: { id: pnn_id } });
      if (!pnn) {
        return res
          .status(404)
          .json({ success: false, message: "PNN introuvable" });
      }
      console.log("PNN:", pnn);
      console.log("Bloc Min:", pnn.bloc_min);
      console.log("Bloc Max:", pnn.block_max);
      // Vérifier que chaque numéro est valide
      for (const numero of numero_attribue) {
        if (numero < pnn.bloc_min || numero > pnn.block_max) {
          return res.status(400).json({
            success: false,
            message: `Le numéro ${numero} est en dehors de la plage autorisée`
          });
        }
      }

      // Vérifier si un numéro appartient déjà à l'attribution actuelle
      const existingNumbers = await NumeroAttribue.findAll({
        where: { numero_attribue: { [Op.in]: numero_attribue } }
      });

      // Liste des numéros déjà attribués à cette attribution
      const existingAssignedNumbers = existingNumbers.filter(
        (num) => num.attribution_id === attribution.id
      );

      // Liste des nouveaux numéros
      const numbersToAdd = numero_attribue.filter(
        (numero) =>
          !existingAssignedNumbers
            .map((num) => num.numero_attribue)
            .includes(numero)
      );

      // Vérifier si les nouveaux numéros sont déjà attribués ailleurs
      const conflictNumbers = existingNumbers
        .filter((num) => num.attribution_id !== attribution.id)
        .map((num) => num.numero_attribue);

      if (conflictNumbers.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Les numéros suivants sont déjà attribués à une autre attribution: ${conflictNumbers.join(
            ", "
          )}`
        });
      }

      // Mise à jour de l'attribution
      attribution.type_utilisation_id = type_utilisation_id;
      attribution.service_id = service_id;
      attribution.pnn_id = pnn_id;
      attribution.client_id = client_id;
      attribution.regle = regle;
      attribution.utilisation_id = utilisation_id;
      await attribution.save();

      // Supprimer les anciens numéros non utilisés
      await NumeroAttribue.destroy({
        where: {
          attribution_id: attribution.id,
          numero_attribue: { [Op.notIn]: numero_attribue }
        }
      });

      // Ajouter les nouveaux numéros attribués
      const numeroAttribueEntries = numbersToAdd.map((numero) => ({
        attribution_id: attribution.id,
        numero_attribue: numero,
        created_at: new Date(),
        updated_at: new Date()
      }));

      await NumeroAttribue.bulkCreate(numeroAttribueEntries);

      const fichierUrl = file ? `/uploads/${file.filename}` : null;

      await HistoriqueAttribution.create({
        attribution_id: attribution.id,
        reference_modification: null,
        motif: motif || "Reclamation de l'attribution",
        utilisateur_id: req.user.id,
        type_modification: "reclamation",
        date_debut: dateDebut,
        duree_suspension: dureeSuspension,
        date_fin_suspension: dateFinSuspension,
        appliquee: false,
        fichier: fichierUrl
      });

      return res.status(200).json({
        success: true,
        message: "Attribution reclamer avec succès",
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
    +6;
    try {
      const { pnn_id } = req.params;

      if (!pnn_id) {
        return res.status(400).json({ error: "PNN ID est requis." });
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
      const file = req.file;

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

      // Réponse si l'attribution et la décision ont été bien mises à jour
      return res.status(200).json({
        success: true,
        message: "Référence assignée et attribution mise à jour avec succès",
        attributionDecision
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
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
  //         return res.status(400).json({ message: "La référence est requise" });
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
  //           return res.status(400).json({
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
        return res.status(400).json({
          message:
            "Données manquantes : attributionId, motif, dateDebut, ou dureeSuspension."
        });
      }

      // Vérification de la validité de la date de début
      const dateDebutObj = new Date(dateDebut);
      if (isNaN(dateDebutObj.getTime())) {
        return res.status(400).json({ message: "Date de début invalide." });
      }

      // Vérification et extraction de la durée de suspension (mois ou années)
      const match = dureeSuspension.match(/^(\d+)\s*(mois|ans)$/i);
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
      return res.status(500).json({ message: "Erreur interne du serveur." });
    }
  }

  static async getAttributionDecisions(req, res) {
    const { id } = req.params; // Récupérer l'id depuis les paramètres de la route

    // Vérifier si l'attributionId est défini
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "L'identifiant de l'attribution est requis."
      });
    }

    try {
      const decisions = await AttributionDecision.findAll({
        where: { attribution_id: id } // Utiliser 'id' ici
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
}

module.exports = AttributionNumeroController;
