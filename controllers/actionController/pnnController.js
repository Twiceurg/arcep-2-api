const { Pnn, Service, AttributionNumero } = require("../../models");

class PnnController {
  // 📌 Créer un PNN
  static async createPnn(req, res) {
    try {
      const {
        partition_prefix,
        partition_length,
        bloc_min,
        block_max,
        length_number,
        service_id
      } = req.body;

      if (
        !partition_prefix ||
        !partition_length ||
        !bloc_min ||
        !block_max ||
        !length_number ||
        !service_id
      ) {
        return res.status(400).json({ message: "Tous les champs sont requis" });
      }

      // Vérifier si le service existe
      const service = await Service.findByPk(service_id);
      if (!service) {
        return res.status(404).json({ message: "Service non trouvé" });
      }

      // Création du PNN
      const pnn = await Pnn.create({
        partition_prefix,
        partition_length,
        bloc_min,
        block_max,
        length_number,
        service_id
      });

      return res.status(201).json({
        success: true,
        message: "PNN créé avec succès",
        pnn
      });
    } catch (error) {
      console.error(error);
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
        bloc_min,
        block_max,
        length_number,
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
      pnn.bloc_min = bloc_min;
      pnn.block_max = block_max;
      pnn.length_number = length_number;
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
        where: { service_id: serviceId },
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
}

module.exports = PnnController;
