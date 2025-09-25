const { Utilisation, Service, Category } = require("../../models");

class UtilisationController {
  // Création d'une nouvelle utilisation
  async create(req, res) {
    try {
      const { details, service_id } = req.body;

      // Vérifier si le service existe
      const service = await Service.findByPk(service_id);
      if (!service) {
        return res. json({ message: "Service not found" });
      }

      // Récupérer l'ID de la catégorie depuis le service
      const category_id = service.category_id;

      // Créer l'utilisation
      const utilisation = await Utilisation.create({
        nom: details,
        service_id,
        category_id
      });

      return res. json({
        message: "Utilisation created successfully!",
        success: true,
        data: utilisation
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error creating Utilisation", success: false, error });
    }
  }

  // Récupérer toutes les utilisations par service_id
  async getUtilisationByService(req, res) {
    try {
      const { service_id } = req.params;

      // Récupérer les utilisations pour ce service_id
      const utilisations = await Utilisation.findAll({
        where: { service_id },
        include: [{ model: Service }, { model: Category }]
      });

      if (utilisations.length === 0) {
        return res .json({
          message: "No utilisations found for this service.",
          success: false
        });
      }

      return res. json({
        message: "Utilisations by service retrieved successfully!",
        success: true,
        data: utilisations
      });
    } catch (error) {
      return res. json({
        message: "Error retrieving utilisations by service.",
        success: false,
        error
      });
    }
  }

  // Récupérer toutes les utilisations
  async getAll(req, res) {
    try {
      const utilisations = await Utilisation.findAll({
        include: [{ model: Service }]
      });

      return res. json({
        message: "All utilisations retrieved successfully!",
        success: true,
        data: utilisations
      });
    } catch (error) {
      return res.json({
        message: "Error retrieving utilisations.",
        success: false,
        error
      });
    }
  }

  // Récupérer une utilisation par ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const utilisation = await Utilisation.findByPk(id, {
        include: [
          { model: Service, as: "service" },
          { model: Category, as: "category" }
        ]
      });

      if (!utilisation) {
        return res.json({
          message: "Utilisation not found.",
          success: false
        });
      }

      return res. json({
        message: "Utilisation retrieved successfully!",
        success: true,
        data: utilisation
      });
    } catch (error) {
      return res.json({
        message: "Error retrieving Utilisation.",
        success: false,
        error
      });
    }
  }

  // Mise à jour d'une utilisation
  async update(req, res) {
    try {
      const { id } = req.params;
      const { details, service_id } = req.body;

      // Vérifier si le service existe
      const service = await Service.findByPk(service_id);
      if (!service) {
        return res. json({success: false, message: "Service not found" });
      }

      // Vérifier si l'utilisation existe
      const utilisation = await Utilisation.findByPk(id);
      if (!utilisation) {
        return res.json({success: false, message: "Utilisation not found" });
      }

      // Mettre à jour l'utilisation
      utilisation.nom = details;
      utilisation.service_id = service_id;
      utilisation.category_id = service.category_id;

      await utilisation.save();
      return res. json({
        message: "Utilisation updated successfully!",
        success: true,
        data: utilisation
      });
    } catch (error) {
      return res.json({
        message: "Error updating Utilisation.",
        success: false,
        error
      });
    }
  }

  // Supprimer une utilisation
  async delete(req, res) {
    try {
      const { id } = req.params;
      const utilisation = await Utilisation.findByPk(id);
      if (!utilisation) {
        return res.json({
          message: "Utilisation not found.",
          success: false
        });
      }

      await utilisation.destroy();
      return res.json({
        message: "Utilisation deleted successfully!",
        success: true
      });
    } catch (error) {
      return res. json({
        message: "Error deleting Utilisation.",
        success: false,
        error
      });
    }
  }
}

module.exports = new UtilisationController();
