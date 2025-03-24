const { Category } = require("../../models");

class CategoriesController {
  // Créer un Category
  static async createCategorie(req, res) {
    try {
      const { nom } = req.body;

      // Validation des données
      if (!nom || nom.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Le libellé est requis"
        });
      }

      // Vérifier si le Category existe déjà
      const existingCategory = await Category.findOne({ where: { nom } });
      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: "Ce Category existe déjà"
        });
      }

      // Création du Category
      const newCategory = await Category.create({ nom });

      return res.status(201).json({
        success: true,
        message: "Category créé avec succès",
        data: newCategory
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }

  // Récupérer tous les Categorys
  static async getAllCategorie(req, res) {
    try {
      const Categorys = await Category.findAll();
      return res.status(200).json({
        success: true,
        message: "Liste des Categorys récupérée avec succès",
        data: Categorys
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }

  // Mettre à jour un Category
  static async updateCategorie(req, res) {
    try {
      const { id } = req.params;
      const { nom } = req.body;

      // Vérifier si le Category existe
      const existingCategory = await Category.findByPk(id);
      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: "Category non trouvé"
        });
      }

      // Vérifier si un autre Category avec le même libellé existe déjà
      const duplicateCategory = await Category.findOne({ where: { nom } });
      if (duplicateCategory && duplicateCategory.id !== parseInt(id)) {
        return res.status(409).json({
          success: false,
          message: "Un Category avec ce libellé existe déjà"
        });
      }

      // Mise à jour
      existingCategory.nom = nom;
      await existingCategory.save();

      return res.status(200).json({
        success: true,
        message: "Category mis à jour avec succès",
        data: existingCategory
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }

  // Supprimer un Category
  static async deleteCategorie(req, res) {
    try {
      const { id } = req.params;

      const existingCategory = await Category.findByPk(id);
      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: "Category non trouvé"
        });
      }

      await existingCategory.destroy();
      return res.status(200).json({
        success: true,
        message: "Category supprimé avec succès"
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

module.exports = CategoriesController;
