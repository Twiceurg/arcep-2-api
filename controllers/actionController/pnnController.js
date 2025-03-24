const { Pnn, Service, AttributionNumero } = require("../../models");

class PnnController {
  // 📌 Créer un PNN
  static async createPnn(req, res) {
    try {
      console.log("Requête reçue:", req.body);

      const {
        partitionLength,
        partitionPrefix,
        partitionPrefixB,
        selectedService,
        selectedCategory
      } = req.body;

      if (
        !partitionLength ||
        !partitionPrefix ||
        !selectedService ||
        (parseInt(selectedCategory, 10) !== 1 && !partitionPrefixB)
      ) {
        return res.status(400).json({ message: "Tous les champs sont requis" });
      }

      // Vérifier si le service existe
      const service = await Service.findByPk(selectedService);
      if (!service) {
        return res.status(404).json({ message: "Service non trouvé" });
      }

      let prefixes = [];

      // Gérer partitionPrefix sous forme de plage (ex: "1-9") ou de liste ("1,2,3")
      if (partitionPrefix.includes("-")) {
        const [start, end] = partitionPrefix.split("-").map(Number);
        prefixes = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      } else {
        prefixes = partitionPrefix.split(",").map(Number);
      }

      console.log("Préfixes générés:", prefixes);

      let prefixBList = [];

      // Vérification du type de selectedCategory
      if (parseInt(selectedCategory, 10) !== 1) {
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
        prefixBList.length > 0 ? prefixBList : "Aucun (catégorie 1)"
      );

      let pnnList = [];

      for (const prefix of prefixes) {
        if (parseInt(selectedCategory, 10) === 1) {
          // Cas où on n'a pas de partitionPrefixB
          const basePrefix = `${prefix}`;
          const remainingLength = partitionLength - basePrefix.length;

          if (remainingLength < 0) {
            return res.status(400).json({
              message: `La longueur du préfixe ${basePrefix} dépasse la partitionLength spécifiée`
            });
          }

          const bloc_min = parseInt(basePrefix + "0".repeat(remainingLength));
          const block_max = parseInt(basePrefix + "9".repeat(remainingLength));

          console.log("Insertion du PNN (sans prefixB):", {
            partition_prefix: prefix,
            partition_length: partitionLength,
            bloc_min,
            block_max,
            service_id: selectedService
          });

          const pnn = await Pnn.create({
            partition_prefix: prefix,
            partition_length: partitionLength,
            bloc_min,
            block_max,
            service_id: selectedService
          });

          pnnList.push(pnn);
        } else {
          // Cas où on a partitionPrefixB
          for (const prefixB of prefixBList) {
            const basePrefix = `${prefix}${prefixB}`;
            const remainingLength = partitionLength - basePrefix.length;

            if (remainingLength < 0) {
              return res.status(400).json({
                message: `La longueur du préfixe ${basePrefix} dépasse la partitionLength spécifiée`
              });
            }

            const bloc_min = parseInt(basePrefix + "0".repeat(remainingLength));
            const block_max = parseInt(
              basePrefix + "9".repeat(remainingLength)
            );

            console.log("Insertion du PNN (avec prefixB):", {
              partition_prefix: prefix,
              partition_prefix_b: prefixB,
              partition_length: partitionLength,
              bloc_min,
              block_max,
              service_id: selectedService
            });

            const pnn = await Pnn.create({
              partition_prefix: prefix,
              partition_prefix_b: prefixB,
              partition_length: partitionLength,
              bloc_min,
              block_max,
              service_id: selectedService
            });

            pnnList.push(pnn);
          }
        }
      }

      return res.status(201).json({
        success: true,
        message: "PNN créés avec succès",
        pnnList
      });
    } catch (error) {
      console.error("Erreur lors de la création du PNN:", error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }

  // 📌 Récupérer tous les PNN avec leur service associé
  static async getAllPnns(req, res) {
    try {
      const pnns = await Pnn.findAll({
        include: [
          { model: Service },
          { model: AttributionNumero, as: "attributions" }
        ]
      });

      return res.status(200).json({
        success: true,
        pnns
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
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
        service_id
      } = req.body;

      // Vérifier si le PNN existe
      const pnn = await Pnn.findByPk(id);
      if (!pnn) {
        return res.status(404).json({
          success: false,
          message: "PNN non trouvé"
        });
      }

      // Vérifier si le service existe
      const service = await Service.findByPk(service_id);
      if (!service) {
        return res.status(404).json({ message: "Service non trouvé" });
      }

      // Mise à jour
      pnn.partition_prefix = partition_prefix;
      pnn.partition_length = partition_length;
      pnn.partition_prefix_b = partition_prefix_b;
      pnn.category_id = category_id;
      pnn.bloc_min = bloc_min;
      pnn.block_max = block_max;
      pnn.service_id = service_id;
      await pnn.save();

      return res.status(200).json({
        success: true,
        message: "PNN mis à jour avec succès",
        data: pnn
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
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
        include: [
          { model: Service }, // Inclure le service associé
          { model: AttributionNumero, as: "attributions" } // Inclure les attributions associées
        ]
      });

      if (!pnn) {
        return res.status(404).json({ message: "PNN non trouvé" });
      }

      return res.status(200).json({
        success: true,
        pnn
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }

  // 📌 Supprimer un PNN
  static async deletePnn(req, res) {
    try {
      const { id } = req.params;

      const pnn = await Pnn.findByPk(id);
      if (!pnn) {
        return res.status(404).json({ message: "PNN non trouvé" });
      }

      await pnn.destroy();
      return res.status(200).json({ message: "PNN supprimé avec succès" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
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
          { model: AttributionNumero, as: "attributions" }
        ]
      });

      if (pnns.length === 0) {
        return res
          .status(404)
          .json({ message: "Aucun PNN trouvé pour ce service" });
      }

      return res.status(200).json({
        success: true,
        pnns
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }

  static async toggleEtat(req, res) {
    try {
      const { id } = req.params;

      // Vérifier si le PNN existe
      const pnn = await Pnn.findByPk(id);
      if (!pnn) {
        return res
          .status(404)
          .json({ success: false, message: "PNN non trouvé" });
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
      return res.status(500).json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }
}

module.exports = PnnController;
