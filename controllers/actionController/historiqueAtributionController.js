const {
  HistoriqueAttribution,
  Utilisateur,
  AttributionNumero,
  NumeroAttribue,
  AttributionDecision,
  Service,
  Category,
  Client,
  TypeUtilisation,
  Utilisation,
  Rapport,
  Pnn
} = require("../../models");
const { Op } = require("sequelize");

const historiqueAttributionController = {
  /**
   * Récupérer la liste des historiques liés à une attribution
   */
  async getHistoriqueByAttribution(req, res) {
    try {
      const { attribution_id } = req.params;

      // Vérifier si l'attribution existe
      const attribution = await AttributionNumero.findByPk(attribution_id);
      if (!attribution) {
        return res.status(404).json({ message: "Attribution non trouvée" });
      }

      // Récupérer les historiques liés à cette attribution
      const historique = await HistoriqueAttribution.findAll({
        where: { attribution_id },
        include: [
          { model: Utilisateur },
          {
            model: AttributionNumero,
            include: [
              { model: Client },
              { model: Utilisation },

              { model: TypeUtilisation },
              {
                model: Pnn,
                include: [{ model: Utilisation }]
              },
              { model: NumeroAttribue },
              { model: Rapport }
            ]
          }
        ],
        order: [["created_at", "DESC"]]
      });

      return res.status(200).json(historique);
    } catch (error) {
      console.error("Erreur lors de la récupération de l'historique :", error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  },

  async appliquerSuspension(req, res) {
    try {
      console.log(req.body); // Pour debug des données reçues
      console.log(req.files); // Pour debug des fichiers reçus

      const utilisateurId = req.user.id;

      // Extraction des données
      const {
        attributionId,
        motif,
        dateDebut,
        dureeSuspension,
        reference_decision,
        numeros_selectionnes
      } = req.body;

      // Vérification et conversion de attributionId
      const attributionIdInt = parseInt(attributionId, 10);
      if (isNaN(attributionIdInt)) {
        return res.status(400).json({ message: "attributionId invalide." });
      }

      // Gestion des fichiers uploadés
      const fichierUrl = req.files?.fichier?.[0]
        ? `/uploads/${req.files.fichier[0].filename}`
        : null;
      const decisionFileUrl = req.files?.decision_file?.[0]
        ? `/uploads/${req.files.decision_file[0].filename}`
        : null;

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

      // Création de l'entrée d'historique de suspension
      const historique = await HistoriqueAttribution.create({
        attribution_id: attributionIdInt,
        reference_modification: null,
        motif,
        utilisateur_id: utilisateurId,
        type_modification: "suspension",
        date_debut: dateDebutObj,
        duree_suspension: dureeSuspension,
        date_fin_suspension: dateFinSuspension,
        appliquee: false,
        fichier: fichierUrl
      });

      // Injection des données nécessaires pour assignReference
      req.body.historiqueId = historique.id;
      req.body.date_attribution = dateDebutObj;
      req.body.duree_utilisation = null;
      req.body.reference_decision = reference_decision;
      req.body.numeros_selectionnes = numeros_selectionnes;
      req.body.decision_file_url = decisionFileUrl;

      // Appel direct à assignReference
      return await historiqueAttributionController.assignReference(req, res);
    } catch (error) {
      console.error("Erreur lors de l'application de la suspension :", error);
      return res.status(500).json({ message: "Erreur interne du serveur." });
    }
  },

  async appliquerRetrait(req, res) {
    try {
      console.log(req.body);
      console.log(req.file);

      const utilisateurId = req.user.id;
      const {
        attributionId,
        motif,
        dateDebut,
        reference_decision,
        numeros_selectionnes
      } = req.body;

      const fichierUrl = req.files?.fichier
        ? `/uploads/${req.files.fichier[0].filename}`
        : null;
      const decisionFileUrl = req.files?.decision_file
        ? `/uploads/${req.files.decision_file[0].filename}`
        : null;

      // Vérification des champs obligatoires
      if (!attributionId || !motif || !dateDebut) {
        return res.status(400).json({
          message: "Données manquantes : attributionId, motif ou dateDebut."
        });
      }

      // Vérification de la validité de la date de début
      const dateDebutObj = new Date(dateDebut);
      if (isNaN(dateDebutObj.getTime())) {
        return res.status(400).json({ message: "Date de début invalide." });
      }

      // Création de l'entrée d'historique sans durée ni date de fin
      const historique = await HistoriqueAttribution.create({
        attribution_id: attributionId,
        reference_modification: null,
        motif,
        utilisateur_id: utilisateurId,
        type_modification: "retrait",
        date_debut: dateDebut,
        duree_suspension: null,
        date_fin_suspension: null,
        appliquee: false,
        fichier: fichierUrl
      });

      // Injection des données nécessaires pour assignReference
      req.body.historiqueId = historique.id;
      req.body.date_attribution = dateDebut;
      req.body.duree_utilisation = null;
      req.body.reference_decision = reference_decision;
      req.body.numeros_selectionnes = numeros_selectionnes;
      req.body.decision_file_url = decisionFileUrl;

      // Appel direct à assignReference
      return await historiqueAttributionController.assignReference(req, res);
    } catch (error) {
      console.error("Erreur lors de l'application du retrait :", error);
      return res.status(500).json({ message: "Erreur interne du serveur." });
    }
  },

  async appliquerRésiliation(req, res) {
    try {
      console.log(req.body);
      console.log(req.files);

      const utilisateurId = req.user.id;
      const {
        attributionId,
        motif,
        dateDebut,
        reference_decision,
        numeros_selectionnes
      } = req.body;

      // Récupération des fichiers uploadés (si présence)
      const fichierUrl = req.files?.fichier
        ? `/uploads/${req.files.fichier[0].filename}`
        : null;

      const decisionFileUrl = req.files?.decision_file
        ? `/uploads/${req.files.decision_file[0].filename}`
        : null;

      // Vérification des champs obligatoires
      if (!attributionId || !motif || !dateDebut) {
        return res.status(400).json({
          message: "Données manquantes : attributionId, motif ou dateDebut."
        });
      }

      // Validation date
      const dateDebutObj = new Date(dateDebut);
      if (isNaN(dateDebutObj.getTime())) {
        return res.status(400).json({ message: "Date de début invalide." });
      }

      // Création de l'entrée dans l'historique
      const historique = await HistoriqueAttribution.create({
        attribution_id: attributionId,
        reference_modification: null,
        motif,
        utilisateur_id: utilisateurId,
        type_modification: "résiliation",
        date_debut: dateDebut,
        duree_suspension: null,
        date_fin_suspension: null,
        appliquee: false,
        fichier: fichierUrl
      });

      // Préparation des données pour assignReference
      req.body.historiqueId = historique.id;
      req.body.date_attribution = dateDebut;
      req.body.duree_utilisation = null;
      req.body.reference_decision = reference_decision;
      req.body.numeros_selectionnes = numeros_selectionnes;
      req.body.decision_file_url = decisionFileUrl;

      // Appel de la fonction assignReference (du controller)
      return await historiqueAttributionController.assignReference(req, res);
    } catch (error) {
      console.error("Erreur lors de l'application de Résiliation :", error);
      return res.status(500).json({ message: "Erreur interne du serveur." });
    }
  },

  async assignReference(req, res) {
    try {
      const { id } = req.params;
      const {
        reference_decision,
        date_attribution,
        duree_utilisation,
        historiqueId,
        numeros_selectionnes,
        decision_file_url
      } = req.body;
      // const file = req.file;

      console.log("Type de numeros_selectionnes:", typeof numeros_selectionnes);
      console.log("Est-ce un tableau ?", Array.isArray(numeros_selectionnes));
      console.log("Contenu:", numeros_selectionnes);

      // Vérifier si l'historique existe
      const historique = await HistoriqueAttribution.findByPk(historiqueId, {
        include: [{ model: AttributionNumero }]
      });

      if (!historique) {
        return res.status(404).json({ message: "Historique non trouvé" });
      }

      // On s'assure que numerosAffectes est bien un tableau
      let numerosAffectes = [];

      // Traitement facultatif de numeros_selectionnes s’il est défini
      if (numeros_selectionnes) {
        if (typeof numeros_selectionnes === "string") {
          try {
            numerosAffectes = JSON.parse(numeros_selectionnes);
            if (!Array.isArray(numerosAffectes)) {
              return res.json({
                success: false,
                message: "Format des numéros sélectionnés invalide"
              });
            }
          } catch {
            return res.json({
              success: false,
              message: "Format des numéros sélectionnés invalide"
            });
          }
        } else if (Array.isArray(numeros_selectionnes)) {
          numerosAffectes = numeros_selectionnes;
        } else {
          return res.json({
            success: false,
            message: "Les numéros sélectionnés doivent être un tableau"
          });
        }
      }

      const attribution = historique.AttributionNumero; // L'attribution associée à l'historique

      // Fonction de mise à jour de l'historique et création de la décision
      const updateHistoriqueAndCreateDecision = async (
        decisionType,
        status,
        additionalData = {}
      ) => {
        historique.appliquee = true;
        historique.reference_modification = reference_decision;
        historique.fichier = decision_file_url || null;
        await historique.save();

        // Mise à jour du statut du numéro attribué
        // Mise à jour du statut du numéro attribué
        if (numerosAffectes.length > 0) {
          const numeroAttribue = await NumeroAttribue.findAll({
            where: {
              attribution_id: attribution.id,
              numero_attribue: {
                [Op.in]: numerosAffectes
              }
            }
          });

          if (!numeroAttribue || numeroAttribue.length === 0) {
            return res.json({
              success: false,
              message: "Aucun numéro attribué correspondant trouvé"
            });
          }

          for (const numero of numeroAttribue) {
            numero.statut = status;
            await numero.save();
          }
        }

        // Créer une décision
        const attributionDecision = await AttributionDecision.create({
          attribution_id: attribution.id,
          reference_decision,
          date_attribution: historique.date_debut,
          date_expiration: additionalData.date_expiration || null,
          duree_utilisation: additionalData.duree_utilisation || null,
          etat_autorisation: false,
          fichier: decision_file_url || null,
          type_decision: decisionType
        });

        return res.status(200).json({
          success: true,
          message: `${
            decisionType.charAt(0).toUpperCase() + decisionType.slice(1)
          } appliqué avec succès`,
          attributionDecision
        });
      };

      // Gestion des différents types de modification
      switch (historique.type_modification) {
        case "modification":
        case "reclamation":
          const lastAttributionDecision = await AttributionDecision.findOne({
            where: {
              attribution_id: attribution.id,
              type_decision: "attribution"
            },
            order: [["created_at", "ASC"]] // Récupérer la plus ancienne
          });

          if (!lastAttributionDecision) {
            return res.json({
              message: "Aucune décision d'attribution trouvée"
            });
          }

          historique.duree_suspension =
            lastAttributionDecision.duree_utilisation;

          return await updateHistoriqueAndCreateDecision(
            historique.type_modification,
            "actif",
            {
              date_expiration: lastAttributionDecision.date_expiration,
              duree_utilisation:
                lastAttributionDecision.duree_utilisation.Array,
              etat_autorisation: true
            }
          );

        case "retrait":
          return await updateHistoriqueAndCreateDecision("retrait", "retiré");

        case "résiliation":
          return await updateHistoriqueAndCreateDecision(
            "résiliation",
            "résiliation"
          );

        default:
          break;
      }

      // Si une date d'attribution est fournie, la mettre à jour
      if (date_attribution) {
        historique.date_debut = new Date(date_attribution);
      }

      // Mise à jour de la durée de suspension si fournie
      if (duree_utilisation) {
        historique.duree_suspension = duree_utilisation;
      }

      // Calcul de la date de fin de suspension si une durée est fournie
      let dureeEnMois = 0;
      if (duree_utilisation) {
        const dureeMatch = duree_utilisation.match(/^(\d+)\s*(mois|ans)$/i);
        if (dureeMatch) {
          dureeEnMois = parseInt(dureeMatch[1], 10);
          if (dureeMatch[2].toLowerCase() === "ans") {
            dureeEnMois *= 12; // Convertir les années en mois
          }
        }
      }

      // Calcul de la date de fin de suspension
      if (dureeEnMois > 0) {
        const date_fin_suspension = new Date(historique.date_debut);
        date_fin_suspension.setMonth(
          date_fin_suspension.getMonth() + dureeEnMois
        );
        historique.date_fin_suspension = date_fin_suspension;
      }

      // Modifier le statut du numéro attribué
      const numeroAttribue = await NumeroAttribue.findAll({
        where: {
          attribution_id: attribution.id,
          numero_attribue: {
            [Op.in]: numerosAffectes
          }
        }
      });

      if (!numeroAttribue || numeroAttribue.length === 0) {
        return res.status(404).json({ message: "Numéro attribué non trouvé" });
      }

      historique.reference_modification = reference_decision;
      historique.appliquee = true;
      await historique.save();

      for (const numero of numeroAttribue) {
        numero.statut = "suspendu";
        await numero.save();
      }

      // Mise à jour de l'historique et création de la décision de suspension
      const attributionDecision = await AttributionDecision.create({
        attribution_id: attribution.id,
        reference_decision,
        date_attribution: historique.date_debut,
        date_expiration: historique.date_fin_suspension,
        duree_utilisation: historique.duree_suspension,
        etat_autorisation: true,
        fichier: decision_file_url || null,
        type_decision: "suspension"
      });

      return res.status(200).json({
        success: true,
        message: "Référence assignée et historique mis à jour avec succès",
        attributionDecision
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }

  // async assignReference(req, res) {
  //   try {
  //     const { id } = req.params;
  //     const { reference_decision, date_attribution, duree_utilisation } =
  //       req.body;
  //     const file = req.file;

  //     // Vérifier si l'attribution existe
  //     const attribution = await AttributionNumero.findByPk(id, {
  //       include: [{ model: Service, include: [{ model: Category }] }]
  //     });

  //     if (!attribution) {
  //       return res.status(404).json({ message: "Attribution non trouvée" });
  //     }

  //     // Vérifier si l'historique existe avec l'id passé dans la requête
  //     const historique = await HistoriqueAttribution.findByPk(id); // On utilise directement l'id ici

  //     if (!historique) {
  //       return res.status(404).json({ message: "Historique non trouvé" });
  //     }

  //     // Mise à jour de la date de début si fournie
  //     if (date_attribution) {
  //       historique.date_debut = new Date(date_attribution);
  //     }

  //     // Mise à jour de la durée de suspension si fournie
  //     if (duree_utilisation) {
  //       historique.duree_suspension = duree_utilisation;
  //     }

  //     // Calcul de la date de fin de suspension à partir de la durée
  //     let dureeEnMois = 0;
  //     if (duree_utilisation) {
  //       const dureeMatch = duree_utilisation.match(/^(\d+)\s*(mois|ans)$/i);
  //       if (dureeMatch) {
  //         dureeEnMois = parseInt(dureeMatch[1], 10);
  //         if (dureeMatch[2].toLowerCase() === "ans") {
  //           dureeEnMois *= 12; // Convertir les années en mois
  //         }
  //       }
  //     }

  //     // Calcul de la date de fin de suspension si une durée est fournie
  //     if (dureeEnMois > 0) {
  //       let date_fin_suspension = new Date(historique.date_debut);
  //       date_fin_suspension.setMonth(
  //         date_fin_suspension.getMonth() + dureeEnMois
  //       );
  //       historique.date_fin_suspension = date_fin_suspension;
  //     }

  //     // Récupérer le numéro attribué
  //     const numeroAttribue = await NumeroAttribue.findOne({
  //       where: { attribution_id: attribution.id }
  //     });

  //     if (!numeroAttribue) {
  //       return res.status(404).json({ message: "Numéro attribué non trouvé" });
  //     }

  //     // Modifier le statut du numéro attribué
  //     numeroAttribue.statut = "suspendu";
  //     await numeroAttribue.save();

  //     // Mise à jour de l'historique
  //     historique.appliquee = true; // Appliquer les changements
  //     historique.reference_modification = reference_decision;

  //     await historique.save();

  //     // Création de la décision d'attribution
  //     const attributionDecision = await AttributionDecision.create({
  //       attribution_id: attribution.id,
  //       reference_decision,
  //       date_attribution: historique.date_debut,
  //       date_expiration: historique.date_fin_suspension,
  //       duree_utilisation: historique.duree_suspension,
  //       etat_autorisation: true,
  //       fichier: `/uploads/${file.filename}`,
  //       type_decision:'suspension'
  //     });

  //     // Réponse si l'attribution et la décision ont été bien mises à jour
  //     return res.status(200).json({
  //       success: true,
  //       message: "Référence assignée et historique mis à jour avec succès",
  //       attributionDecision
  //     });
  //   } catch (error) {
  //     console.error(error);
  //     return res.status(500).json({ message: "Erreur interne du serveur" });
  //   }
  // }

  // async assignReference(req, res) {
  //   try {
  //     const { id } = req.params;
  //     const { reference_decision, date_attribution, duree_utilisation } =
  //       req.body;
  //     const file = req.file;

  //     // Vérifier si l'historique existe avec l'id passé dans la requête
  //     const historique = await HistoriqueAttribution.findByPk(id, {
  //       include: [{ model: AttributionNumero }] // Inclure l'attribution associée à l'historique
  //     });

  //     if (!historique) {
  //       return res.status(404).json({ message: "Historique non trouvé" });
  //     }

  //     // Récupérer l'attribution associée à l'historique
  //     const attribution = historique.AttributionNumero; // L'attribution associée à l'historique

  //     // Vérifier le type de modification
  //     if (
  //       historique.type_modification === "modification" ||
  //       historique.type_modification === "reclamation"
  //     ) {
  //       const lastAttributionDecision = await AttributionDecision.findOne({
  //         where: {
  //           attribution_id: attribution.id,
  //           type_decision: "attribution"
  //         },
  //         order: [["created_at", "ASC"]] // Récupérer la plus récente
  //       });

  //       if (!lastAttributionDecision) {
  //         return res
  //           .status(404)
  //           .json({ message: "Aucune décision d'attribution trouvée" });
  //       }

  //       // Mise à jour de l'historique uniquement avec la référence et le fichier
  //       historique.appliquee = true;
  //       historique.reference_modification = reference_decision;
  //       historique.duree_suspension = lastAttributionDecision.duree_utilisation;
  //       await historique.save();

  //       // Récupérer la dernière décision d'attribution (type = "attribution")

  //       // Utiliser les données de la décision d'attribution récupérée
  //       const attributionDecision = await AttributionDecision.create({
  //         attribution_id: attribution.id,
  //         reference_decision,
  //         date_attribution: lastAttributionDecision.date_attribution,
  //         date_expiration: lastAttributionDecision.date_expiration,
  //         duree_utilisation: lastAttributionDecision.duree_utilisation,
  //         etat_autorisation: true,
  //         fichier: file ? `/uploads/${file.filename}` : null,
  //         type_decision: historique.type_modification // Utiliser le type de modification de l'historique
  //       });

  //       return res.status(200).json({
  //         success: true,
  //         message:
  //           "Référence et fichier assignés, décision mise à jour avec succès",
  //         attributionDecision
  //       });
  //     }

  //     if (historique.type_modification === "retrait" ) {
  //       // Appliquer les modifications sur l'historique
  //       historique.appliquee = true;
  //       historique.reference_modification = reference_decision;
  //       historique.fichier = file ? `/uploads/${file.filename}` : null;
  //       await historique.save();

  //       // Trouver le numéro attribué lié à l'attribution
  //       const numeroAttribue = await NumeroAttribue.findOne({
  //         where: { attribution_id: attribution.id }
  //       });

  //       if (!numeroAttribue) {
  //         return res
  //           .status(404)
  //           .json({ message: "Numéro attribué non trouvé" });
  //       }

  //       // Modifier le statut du numéro en "retiré"
  //       numeroAttribue.statut = "retiré";
  //       await numeroAttribue.save();

  //       // Créer une décision de type retrait
  //       const attributionDecision = await AttributionDecision.create({
  //         attribution_id: attribution.id,
  //         reference_decision,
  //         date_attribution: historique.date_debut,
  //         date_expiration: null, // Pas de date d’expiration
  //         duree_utilisation: null,
  //         etat_autorisation: false,
  //         fichier: file ? `/uploads/${file.filename}` : null,
  //         type_decision: "retrait"
  //       });

  //       return res.status(200).json({
  //         success: true,
  //         message: "Retrait appliqué avec succès",
  //         attributionDecision
  //       });
  //     }

  //     if (historique.type_modification === "résiliation" ) {
  //       // Appliquer les modifications sur l'historique
  //       historique.appliquee = true;
  //       historique.reference_modification = reference_decision;
  //       historique.fichier = file ? `/uploads/${file.filename}` : null;
  //       await historique.save();

  //       // Trouver le numéro attribué lié à l'attribution
  //       const numeroAttribue = await NumeroAttribue.findOne({
  //         where: { attribution_id: attribution.id }
  //       });

  //       if (!numeroAttribue) {
  //         return res
  //           .status(404)
  //           .json({ message: "Numéro attribué non trouvé" });
  //       }

  //       // Modifier le statut du numéro en "retiré"
  //       numeroAttribue.statut = "résiliation";
  //       await numeroAttribue.save();

  //       // Créer une décision de type retrait
  //       const attributionDecision = await AttributionDecision.create({
  //         attribution_id: attribution.id,
  //         reference_decision,
  //         date_attribution: historique.date_debut,
  //         date_expiration: null, // Pas de date d’expiration
  //         duree_utilisation: null,
  //         etat_autorisation: false,
  //         fichier: file ? `/uploads/${file.filename}` : null,
  //         type_decision: "retrait"
  //       });

  //       return res.status(200).json({
  //         success: true,
  //         message: "Retrait appliqué avec succès",
  //         attributionDecision
  //       });
  //     }

  //     // Sinon, gérer les autres types de décisions (par exemple, suspension)
  //     if (date_attribution) {
  //       historique.date_debut = new Date(date_attribution);
  //     }

  //     // Mise à jour de la durée de suspension si fournie
  //     if (duree_utilisation) {
  //       historique.duree_suspension = duree_utilisation;
  //     }

  //     // Calcul de la date de fin de suspension à partir de la durée
  //     let dureeEnMois = 0;
  //     if (duree_utilisation) {
  //       const dureeMatch = duree_utilisation.match(/^(\d+)\s*(mois|ans)$/i);
  //       if (dureeMatch) {
  //         dureeEnMois = parseInt(dureeMatch[1], 10);
  //         if (dureeMatch[2].toLowerCase() === "ans") {
  //           dureeEnMois *= 12; // Convertir les années en mois
  //         }
  //       }
  //     }

  //     // Calcul de la date de fin de suspension si une durée est fournie
  //     if (dureeEnMois > 0) {
  //       let date_fin_suspension = new Date(historique.date_debut);
  //       date_fin_suspension.setMonth(
  //         date_fin_suspension.getMonth() + dureeEnMois
  //       );
  //       historique.date_fin_suspension = date_fin_suspension;
  //     }

  //     // Modifier le statut du numéro attribué
  //     const numeroAttribue = await NumeroAttribue.findOne({
  //       where: { attribution_id: attribution.id }
  //     });

  //     if (!numeroAttribue) {
  //       return res.status(404).json({ message: "Numéro attribué non trouvé" });
  //     }

  //     // Modifier le statut du numéro attribué
  //     numeroAttribue.statut = "suspendu";
  //     await numeroAttribue.save();

  //     // Mise à jour de l'historique
  //     historique.appliquee = true; // Appliquer les changements
  //     historique.reference_modification = reference_decision;

  //     await historique.save();

  //     // Création de la décision d'attribution
  //     const attributionDecision = await AttributionDecision.create({
  //       attribution_id: attribution.id,
  //       reference_decision,
  //       date_attribution: historique.date_debut,
  //       date_expiration: historique.date_fin_suspension,
  //       duree_utilisation: historique.duree_suspension,
  //       etat_autorisation: true,
  //       fichier: file ? `/uploads/${file.filename}` : null, // Utiliser le fichier si fourni
  //       type_decision: "suspension" // Ou tout autre type approprié
  //     });

  //     // Réponse si l'attribution et la décision ont été bien mises à jour
  //     return res.status(200).json({
  //       success: true,
  //       message: "Référence assignée et historique mis à jour avec succès",
  //       attributionDecision
  //     });
  //   } catch (error) {
  //     console.error(error);
  //     return res.status(500).json({ message: "Erreur interne du serveur" });
  //   }
  // }
};

module.exports = historiqueAttributionController;
