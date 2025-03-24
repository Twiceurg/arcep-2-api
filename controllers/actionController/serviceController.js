const { Service, Category } = require("../../models");

class ServiceController {
  // Créer un service
  static async createService(req, res) {
    try {
      const { nom, category_id } = req.body;

      // Validation des données
      if (!nom || nom.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Le libellé est requis"
        });
      }

      // Vérification de la catégorie
      if (!category_id) {
        return res.status(400).json({
          success: false,
          message: "L'ID de la catégorie est requis"
        });
      }

      // Vérifier si la catégorie existe
      const categoryExists = await Category.findByPk(category_id);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: "La catégorie spécifiée n'existe pas"
        });
      }

      // Vérifier si le service existe déjà
      const existingService = await Service.findOne({ where: { nom } });
      if (existingService) {
        return res.status(409).json({
          success: false,
          message: "Ce service existe déjà"
        });
      }

      // Création du service avec la catégorie associée
      const service = await Service.create({
        nom,
        category_id // Associe le service à la catégorie via `category_id`
      });

      return res.status(201).json({
        success: true,
        message: "Service créé avec succès",
        data: service
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }

  // Récupérer tous les services
  static async getAllServices(req, res) {
    try {
      const services = await Service.findAll({
        include: [
          {
            model: Category
          }
        ]
      });

      return res.status(200).json({
        success: true,
        message: "Liste des services récupérée avec succès",
        data: services
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }

  // Récupérer les services par catégorie
  static async getServicesByCategory(req, res) {
    try {
      const { category_id } = req.params;

      // Vérifier si la catégorie existe
      const categoryExists = await Category.findByPk(category_id);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: "La catégorie spécifiée n'existe pas"
        });
      }

      // Récupérer les services associés à la catégorie
      const services = await Service.findAll({
        where: { category_id },
        include: [{ model: Category }]
      });

      return res.status(200).json({
        success: true,
        message: "Services récupérés avec succès",
        data: services
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }

  // Mettre à jour un service
  static async updateService(req, res) {
    try {
      const { id } = req.params;
      const { nom, category_id } = req.body;

      // Vérifier si le service existe
      const service = await Service.findByPk(id);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service non trouvé"
        });
      }

      // Vérifier si un autre service avec le même libellé existe déjà
      const existingService = await Service.findOne({ where: { nom } });
      if (existingService && existingService.id !== parseInt(id)) {
        return res.status(409).json({
          success: false,
          message: "Un service avec ce libellé existe déjà"
        });
      }

      // Vérification de la catégorie
      if (category_id) {
        // Vérifier si la catégorie existe
        const categoryExists = await Category.findByPk(category_id);
        if (!categoryExists) {
          return res.status(404).json({
            success: false,
            message: "La catégorie spécifiée n'existe pas"
          });
        }

        // Mise à jour de la catégorie du service
        service.category_id = category_id;
      }

      // Mise à jour du nom du service
      service.nom = nom;

      // Sauvegarder les modifications
      await service.save();

      return res.status(200).json({
        success: true,
        message: "Service mis à jour avec succès",
        data: service
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }

  // Supprimer un service
  static async deleteService(req, res) {
    try {
      const { id } = req.params;

      const service = await Service.findByPk(id);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service non trouvé"
        });
      }

      await service.destroy();
      return res.status(200).json({
        success: true,
        message: "Service supprimé avec succès"
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }
}

module.exports = ServiceController;
