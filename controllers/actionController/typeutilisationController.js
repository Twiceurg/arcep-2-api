const { TypeUtilisation, Notification, Utilisateur } = require("../../models");
const { getIo } = require("../../utils/socket");

class TypeUtilisationController {
  // 📌 Créer un type d'utilisation
  static async createTypeUtilisation(req, res) {
    try {
      const { libele_type } = req.body;

      if (!libele_type || libele_type.trim() === "") {
        return res. json({
          success: false,
          message: "Le libellé est requis"
        });
      }

      const existingType = await TypeUtilisation.findOne({
        where: { libele_type }
      });

      if (existingType) {
        return res. json({
          success: false,
          message: "Ce type d'utilisation existe déjà"
        });
      }

      const typeUtilisation = await TypeUtilisation.create({ libele_type });

      const message = `Un nouveau type d'utilisation a été créé : ${libele_type}`;
      const utilisateurs = await Utilisateur.findAll();

      for (let utilisateur of utilisateurs) {
        await Notification.create({
          message,
          user_id: utilisateur.id,
          type: "type_utilisation_creation",
          read: false
        });
      }

      const io = getIo(); // <--- ici on récupère io

      io.emit("notification", {
        message,
        type: "type_utilisation_creation"
      });

      return res.status(201).json({
        success: true,
        message: "Type d'utilisation créé avec succès",
        typeUtilisation
      });
    } catch (error) {
      console.error(error);
      return res.json({
        success: false,
        message: "Erreur interne du serveur"
      });
    }
  }

  // 📌 Récupérer tous les types d'utilisation
  static async getAllTypesUtilisation(req, res) {
    try {
      const types = await TypeUtilisation.findAll();
      return res.status(200).json({
        success: true,
        message: "Types d'utilisation récupérés avec succès",
        types
      });
    } catch (error) {
      console.error(error);
      return res 
        .json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // 📌 Récupérer un type d'utilisation par ID
  static async getTypeUtilisationById(req, res) {
    try {
      const { id } = req.params;
      const type = await TypeUtilisation.findByPk(id);
      if (!type) {
        return res 
          .json({ success: false, message: "Type d'utilisation non trouvé" });
      }

      return res.status(200).json({
        success: true,
        message: "Type d'utilisation récupéré avec succès",
        type
      });
    } catch (error) {
      console.error(error);
      return res 
        .json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // 📌 Mettre à jour un type d'utilisation
  static async updateTypeUtilisation(req, res) {
    try {
      const { id } = req.params;
      const { libele_type } = req.body;
      const typeUtilisation = await TypeUtilisation.findByPk(id);
      if (!typeUtilisation) {
        return res 
          .json({ success: false, message: "Type d'utilisation non trouvé" });
      }
      typeUtilisation.libele_type = libele_type;
      await typeUtilisation.save();

      return res.status(200).json({
        success: true,
        message: "Type d'utilisation mis à jour avec succès",
        typeUtilisation
      });
    } catch (error) {
      console.error(error);
      return res 
        .json({ success: false, message: "Erreur interne du serveur" });
    }
  }

  // 📌 Supprimer un type d'utilisation
  static async deleteTypeUtilisation(req, res) {
    try {
      const { id } = req.params;

      const typeUtilisation = await TypeUtilisation.findByPk(id);
      if (!typeUtilisation) {
        return res 
          .json({ success: false, message: "Type d'utilisation non trouvé" });
      }

      await typeUtilisation.destroy();
      return res.status(200).json({
        success: true,
        message: "Type d'utilisation supprimé avec succès"
      });
    } catch (error) {
      console.error(error);
      return res
        .json({ success: false, message: "Erreur interne du serveur" });
    }
  }
}

module.exports = TypeUtilisationController;
