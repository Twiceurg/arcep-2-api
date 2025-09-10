const {
  Pnn,
  Service,
  AttributionNumero,
  ZoneUtilisation,
  Category,
  Utilisation
} = require("../../models");
const { Op } = require("sequelize");

class PnnController {
  // 📌 Créer un PNN
  // static async createPnn(req, res) {
  //   try {
  //     console.log("Requête reçue:", req.body);

  //     const {
  //       partitionLength,
  //       partitionPrefix,
  //       selectedService,
  //       selectedCategory,
  //       selectedUtilisation,
  //       zoneSelectionnee
  //     } = req.body;

  //     let partitionPrefixB = req.body.partitionPrefixB || null;

  //     if (!partitionLength || !selectedService || !selectedUtilisation) {
  //       return res
  //         .json({success: false, message: "Tous les champs requis ne sont pas remplis" });
  //     }

  //     // Vérifier si le service existe
  //     const service = await Service.findByPk(selectedService);
  //     if (!service) {
  //       return res.json({success: false, message: "Service non trouvé" });
  //     }

  //     let prefixes = [];

  //     // Traitement de partitionPrefix
  //     if (partitionPrefix) {
  //       if (partitionPrefix.includes("-")) {
  //         const [start, end] = partitionPrefix.split("-").map(Number);
  //         prefixes = Array.from(
  //           { length: end - start + 1 },
  //           (_, i) => start + i
  //         );
  //       } else {
  //         prefixes = partitionPrefix.split(",").map(Number);
  //       }
  //     } else {
  //       prefixes = [null]; // On insère un PNN sans partitionPrefix
  //     }

  //     console.log("Préfixes générés:", prefixes);

  //     let prefixBList = [];

  //     // Ne générer partitionPrefixB que s'il est renseigné
  //     if (partitionPrefixB) {
  //       if (partitionPrefixB.includes("-")) {
  //         const [startB, endB] = partitionPrefixB.split("-").map(Number);
  //         prefixBList = Array.from(
  //           { length: endB - startB + 1 },
  //           (_, i) => startB + i
  //         );
  //       } else {
  //         prefixBList = partitionPrefixB.split(",").map(Number);
  //       }
  //     }

  //     console.log(
  //       "Préfixes B générés:",
  //       prefixBList.length > 0 ? prefixBList : "Aucun"
  //     );

  //     let pnnList = [];

  //     for (const prefix of prefixes) {
  //       if (!partitionPrefixB) {
  //         // Cas où partitionPrefixB est vide
  //         const basePrefix = prefix !== null ? `${prefix}` : "";
  //         const remainingLength = partitionLength - basePrefix.length;

  //         if (remainingLength < 0) {
  //           return res.json({ success: false,
  //             message: `La longueur du préfixe ${basePrefix} dépasse la partitionLength spécifiée`
  //           });
  //         }

  //         const bloc_min =
  //           parseInt(basePrefix + "0".repeat(remainingLength)) || 0;
  //         const block_max =
  //           parseInt(basePrefix + "9".repeat(remainingLength)) || 9;

  //         console.log("Insertion du PNN (sans prefixB):", {
  //           partition_prefix: prefix,
  //           partition_length: partitionLength,
  //           bloc_min,
  //           block_max,
  //           service_id: selectedService
  //         });

  //         const pnn = await Pnn.create({
  //           partition_prefix: prefix,
  //           partition_length: partitionLength,
  //           category_id: selectedCategory,
  //           zone_utilisation_id: zoneSelectionnee || null,
  //           bloc_min,
  //           block_max,
  //           service_id: selectedService,
  //           utilisation_id: selectedUtilisation
  //         });

  //         pnnList.push(pnn);
  //       } else {
  //         // Cas où partitionPrefixB est renseigné
  //         for (const prefixB of prefixBList) {
  //           const basePrefix = (prefix !== null ? `${prefix}` : "") + prefixB;
  //           const remainingLength = partitionLength - basePrefix.length;

  //           if (remainingLength < 0) {
  //             return res.json({ success: false,
  //               message: `La longueur du préfixe ${basePrefix} dépasse la partitionLength spécifiée`
  //             });
  //           }

  //           const bloc_min = parseInt(basePrefix + "0".repeat(remainingLength));
  //           const block_max = parseInt(
  //             basePrefix + "9".repeat(remainingLength)
  //           );

  //           console.log("Insertion du PNN (avec prefixB):", {
  //             partition_prefix: prefix,
  //             partition_prefix_b: prefixB,
  //             partition_length: partitionLength,
  //             bloc_min,
  //             block_max,
  //             service_id: selectedService
  //           });

  //           const pnn = await Pnn.create({
  //             partition_prefix: prefix,
  //             partition_prefix_b: prefixB,
  //             partition_length: partitionLength,
  //             zone_utilisation_id: zoneSelectionnee || null,
  //             category_id: selectedCategory,
  //             bloc_min,
  //             block_max,
  //             service_id: selectedService,
  //             utilisation_id: selectedUtilisation
  //           });

  //           pnnList.push(pnn);
  //         }
  //       }
  //     }

  //     return res.status(201).json({
  //       success: true,
  //       message: "PNN créés avec succès",
  //       pnnList
  //     });
  //   } catch (error) {
  //     console.error("Erreur lors de la création du PNN:", error);
  //     return res. json({success: false, message: "Erreur interne du serveur" });
  //   }
  // }

  static async createPnn(req, res) {
    try {
      console.log("Requête reçue:", req.body);

      const {
        partitionLength,
        partitionPrefix,
        partitionPrefixB,
        selectedService,
        selectedCategory,
        selectedUtilisation,
        zoneSelectionnee
      } = req.body;

      // Génération des préfixes A
      let prefixes = [];
      if (partitionPrefix) {
        if (partitionPrefix.includes("-")) {
          const [start, end] = partitionPrefix.split("-").map(Number);
          prefixes = Array.from(
            { length: end - start + 1 },
            (_, i) => start + i
          );
        } else {
          prefixes = partitionPrefix.split(",").map(Number);
        }
      } else {
        prefixes = [null]; // PNN sans partitionPrefix
      }

      console.log("Préfixes générés:", prefixes);

      // Génération des préfixes B
      let prefixBList = [];
      if (partitionPrefixB) {
        if (partitionPrefixB.includes("-")) {
          const [startB, endB] = partitionPrefixB.split("-").map(Number);
          prefixBList = Array.from(
            { length: endB - startB + 1 },
            (_, i) => startB + i
          );
        } else {
          prefixBList = partitionPrefixB.split(",").map(Number);
        }
      }

      console.log(
        "Préfixes B générés:",
        prefixBList.length > 0 ? prefixBList : "Aucun"
      );

      let pnnList = [];

      for (const prefix of prefixes) {
        if (!prefixBList.length) {
          const basePrefix = prefix !== null ? `${prefix}` : "";

          const bloc_min = partitionLength
            ? parseInt(
                basePrefix + "0".repeat(partitionLength - basePrefix.length)
              )
            : null;
          const block_max = partitionLength
            ? parseInt(
                basePrefix + "9".repeat(partitionLength - basePrefix.length)
              )
            : null;

          // Vérification doublon
          const existingPnn = await Pnn.findOne({
            where: {
              partition_prefix: prefix,
              partition_prefix_b: null,
              utilisation_id: selectedUtilisation
            }
          });

          if (existingPnn) {
            return res.json({
              success: false,
              message: `Le préfixe ${prefix} existe déjà pour cette utilisation.`
            });
          }

          const pnn = await Pnn.create({
            partition_prefix: prefix,
            partition_length: partitionLength || null,
            category_id: selectedCategory || null,
            zone_utilisation_id: zoneSelectionnee || null,
            bloc_min,
            block_max,
            service_id: selectedService || null,
            utilisation_id: selectedUtilisation || null
          });

          pnnList.push(pnn);
        } else {
          for (const prefixB of prefixBList) {
            const basePrefix = (prefix !== null ? `${prefix}` : "") + prefixB;

            const bloc_min = partitionLength
              ? parseInt(
                  basePrefix + "0".repeat(partitionLength - basePrefix.length)
                )
              : null;
            const block_max = partitionLength
              ? parseInt(
                  basePrefix + "9".repeat(partitionLength - basePrefix.length)
                )
              : null;

            // Vérification doublon
            const existingPnn = await Pnn.findOne({
              where: {
                partition_prefix: prefix,
                partition_prefix_b: prefixB,
                utilisation_id: selectedUtilisation
              }
            });

            if (existingPnn) {
              return res.json({
                success: false,
                message: `Le préfixe ${prefix}${prefixB} existe déjà pour cette utilisation.`
              });
            }

            const pnn = await Pnn.create({
              partition_prefix: prefix,
              partition_prefix_b: prefixB,
              partition_length: partitionLength || null,
              zone_utilisation_id: zoneSelectionnee || null,
              category_id: selectedCategory || null,
              bloc_min,
              block_max,
              service_id: selectedService || null,
              utilisation_id: selectedUtilisation || null
            });

            pnnList.push(pnn);
          }
        }
      }

      return res.json({
        success: true,
        message: "PNN créés avec succès",
        pnnList
      });
    } catch (error) {
      console.error("Erreur lors de la création du PNN:", error);
      return res.json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }

  // 📌 Récupérer tous les PNN avec leur service associé
  static async getAllPnns(req, res) {
    try {
      const pnns = await Pnn.findAll({
        include: [
          { model: Service },
          { model: AttributionNumero, as: "attributions" },
          { model: Utilisation },
          { model: ZoneUtilisation }
        ]
      });

      return res.status(200).json({
        success: true,
        pnns
      });
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // 📌 Mettre à jour un PNN
  static async updatePnn(req, res) {
    try {
      const { id } = req.params;
      const {
        partition_prefix,
        partition_length,
        partition_prefix_b,
        category_id,
        bloc_min,
        block_max,
        service_id,
        utilisationId
      } = req.body;

      // Vérifier si le PNN existe
      const pnn = await Pnn.findByPk(id);
      if (!pnn) {
        return res.json({ success: false, message: "PNN non trouvé" });
      }

      // Vérifier si le service existe
      const service = await Service.findByPk(service_id);
      if (!service) {
        return res.json({ success: false, message: "Service non trouvé" });
      }

      if (!utilisationId) {
        return res.json({
          success: false,
          message: "utilisationId est requis pour la mise à jour"
        });
      }

      const partitionPrefixStr = String(partition_prefix);
      const partitionPrefixBStr = partition_prefix_b
        ? String(partition_prefix_b)
        : null;

      // Traitement des préfixes
      let prefixes = [];
      if (partitionPrefixStr) {
        if (partitionPrefixStr.includes("-")) {
          const [start, end] = partitionPrefixStr.split("-").map(Number);
          prefixes = Array.from(
            { length: end - start + 1 },
            (_, i) => start + i
          );
        } else {
          prefixes = partitionPrefixStr.split(",").map(Number);
        }
      }

      let prefixBList = [];
      if (partitionPrefixBStr) {
        if (partitionPrefixBStr.includes("-")) {
          const [startB, endB] = partitionPrefixBStr.split("-").map(Number);
          prefixBList = Array.from(
            { length: endB - startB + 1 },
            (_, i) => startB + i
          );
        } else {
          prefixBList = partitionPrefixBStr.split(",").map(Number);
        }
      }

      // Vérification des doublons avant mise à jour
      for (const prefix of prefixes) {
        if (!prefixBList.length) {
          const existing = await Pnn.findOne({
            where: {
              partition_prefix: prefix,
              partition_prefix_b: null,
              utilisation_id: utilisationId,
              id: { [Op.ne]: id } // Exclut le PNN actuel
            }
          });
          if (existing) {
            return res.json({
              success: false,
              message: `Le préfixe ${prefix} existe déjà pour cette utilisation.`
            });
          }
        } else {
          for (const prefixB of prefixBList) {
            const existing = await Pnn.findOne({
              where: {
                partition_prefix: prefix,
                partition_prefix_b: prefixB,
                utilisation_id: utilisationId,
                id: { [Op.ne]: id } // Exclut le PNN actuel
              }
            });
            if (existing) {
              return res.json({
                success: false,
                message: `Le préfixe ${prefix}${prefixB} existe déjà pour cette utilisation.`
              });
            }
          }
        }
      }

      // Mise à jour du PNN
      for (const prefix of prefixes) {
        if (!prefixBList.length) {
          const basePrefix = prefix !== null ? `${prefix}` : "";
          const remainingLength = partition_length - basePrefix.length;

          if (remainingLength < 0) {
            return res.json({
              success: false,
              message: `La longueur du préfixe ${basePrefix} dépasse la partitionLength spécifiée`
            });
          }

          pnn.partition_prefix = prefix;
          pnn.partition_length = partition_length;
          pnn.category_id = category_id;
          pnn.bloc_min =
            parseInt(basePrefix + "0".repeat(remainingLength)) || 0;
          pnn.block_max =
            parseInt(basePrefix + "9".repeat(remainingLength)) || 9;
        } else {
          for (const prefixB of prefixBList) {
            const basePrefix = (prefix !== null ? `${prefix}` : "") + prefixB;
            const remainingLength = partition_length - basePrefix.length;

            if (remainingLength < 0) {
              return res.json({
                success: false,
                message: `La longueur du préfixe ${basePrefix} dépasse la partitionLength spécifiée`
              });
            }

            pnn.partition_prefix = prefix;
            pnn.partition_prefix_b = prefixB;
            pnn.partition_length = partition_length;
            pnn.category_id = category_id;
            pnn.bloc_min =
              parseInt(basePrefix + "0".repeat(remainingLength)) || 0;
            pnn.block_max =
              parseInt(basePrefix + "9".repeat(remainingLength)) || 9;
          }
        }
      }

      pnn.service_id = service_id;
      pnn.utilisation_id = utilisationId;

      await pnn.save();

      return res.json({
        success: true,
        message: "PNN mis à jour avec succès",
        data: pnn
      });
    } catch (error) {
      console.error(error);
      return res.json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }

  // 📌 Récupérer un PNN par ID avec son service associé
  static async getPnnById(req, res) {
    try {
      const { id } = req.params; // L'ID du PNN que l'on veut récupérer

      // Vérifier si le PNN existe
      const pnn = await Pnn.findByPk(id, {
        where: { etat: true },
        include: [
          { model: Service }, // Inclure le service associé
          { model: AttributionNumero, as: "attributions" },
          { model: Utilisation },
          { model: ZoneUtilisation }
        ]
      });

      if (!pnn) {
        return res.json({ message: "PNN non trouvé" });
      }

      return res.json({
        success: true,
        pnn
      });
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // 📌 Supprimer un PNN
  static async deletePnn(req, res) {
    try {
      const { id } = req.params;

      const pnn = await Pnn.findByPk(id);
      if (!pnn) {
        return res.json({ message: "PNN non trouvé" });
      }

      await pnn.destroy();
      return res.status(200).json({ message: "PNN supprimé avec succès" });
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // 📌 Récupérer des PNN par Service ID
  static async getPnnsByServiceId(req, res) {
    try {
      const { serviceId } = req.params;

      // Récupérer les PNNs associés à ce service
      const pnns = await Pnn.findAll({
        where: { service_id: serviceId, etat: true },
        include: [
          { model: Service },
          { model: ZoneUtilisation },
          { model: AttributionNumero, as: "attributions" }
        ]
      });

      if (pnns.length === 0) {
        return res.json({ message: "Aucun PNN trouvé pour ce service" });
      }

      return res.status(200).json({
        success: true,
        pnns
      });
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  static async getPnnsByUtilisationId(req, res) {
    try {
      const { utilisationId } = req.params;

      // Récupérer les PNNs associés à ce utilisation_id
      const pnns = await Pnn.findAll({
        where: { utilisation_id: utilisationId, etat: true },
        include: [
          { model: Service },
          { model: ZoneUtilisation },
          { model: AttributionNumero, as: "attributions" }
        ]
      });

      if (pnns.length === 0) {
        return res.json({
          success: false,
          message: "Aucun PNN trouvé pour ce type d'utilisation"
        });
      }

      return res.status(200).json({
        success: true,
        pnns
      });
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  static async getPnnsByZoneId(req, res) {
    try {
      const { zoneId } = req.params;

      // Récupérer les PNNs associés à ce utilisation_id
      const pnns = await Pnn.findAll({
        where: { zone_utilisation_id: zoneId, etat: true },
        include: [
          { model: Service },
          { model: AttributionNumero, as: "attributions" }
        ]
      });

      if (pnns.length === 0) {
        return res.json({
          success: false,
          message: "Aucun PNN trouvé pour ce type d'utilisation"
        });
      }

      return res.status(200).json({
        success: true,
        pnns
      });
    } catch (error) {
      console.error(error);
      return res.json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  static async toggleEtat(req, res) {
    try {
      const { id } = req.params;

      // Vérifier si le PNN existe
      const pnn = await Pnn.findByPk(id);
      if (!pnn) {
        return res.json({ success: false, message: "PNN non trouvé" });
      }

      // Basculer l'état (true <-> false)
      pnn.etat = !pnn.etat;
      await pnn.save();

      // Définir le message en fonction du nouvel état
      const message = pnn.etat
        ? "PNN activé avec succès"
        : "PNN désactivé avec succès";

      return res.status(200).json({
        success: true,
        message,
        pnn
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'état du PNN :", error);
      return res.json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }
}

module.exports = PnnController;
