const { Client, AttributionNumero } = require("../../models");

class ClientController {
  // 📌 Créer un client
  static async createClient(req, res) {
    try {
      // Remplacer les chaînes vides par null
      const cleanData = {};
      for (const key in req.body) {
        cleanData[key] = req.body[key] === "" ? null : req.body[key];
      }

      const {
        denomination,
        adresse_siege,
        nom_representant_legal,
        fonction_representant_legal,
        adresse_representant_legal,
        telephone_morale,
        email_morale,
        activite
      } = cleanData;

      // Vérifier si le client existe déjà (via l'email ou la dénomination)
      if (email_morale) {
        const existingClient = await Client.findOne({
          where: { email_morale }
        });
        if (existingClient) {
          return res
            .status(400)
            .json({ message: "Un client avec cet email existe déjà." });
        }
      }

      // Création du client
      const client = await Client.create({
        denomination,
        adresse_siege,
        nom_representant_legal,
        fonction_representant_legal,
        adresse_representant_legal,
        telephone_morale,
        email_morale,
        activite
      });

      return res.status(201).json({
        success: true,
        message: "Client créé avec succès",
        client
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }

  // 📌 Récupérer tous les clients
  static async getAllClients(req, res) {
    try {
      const clients = await Client.findAll({
        include: [
          { model: AttributionNumero } // Associer les attributions de numéros
        ],
        order: [["created_at", "DESC"]]
      });

      return res.status(200).json({
        success: true,
        clients
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }

  // 📌 Récupérer un client par ID
  static async getClientById(req, res) {
    try {
      const { id } = req.params;
      const client = await Client.findByPk(id, {
        include: [{ model: AttributionNumero }]
      });

      if (!client) {
        return res.status(404).json({ message: "Client non trouvé" });
      }

      return res.status(200).json({
        success: true,
        client
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }

  // 📌 Mettre à jour un client
  static async updateClient(req, res) {
    try {
      const { id } = req.params;

      // Remplacer les chaînes vides par null
      const cleanData = {};
      for (const key in req.body) {
        cleanData[key] = req.body[key] === "" ? null : req.body[key];
      }

      const {
        denomination,
        adresse_siege,
        nom_representant_legal,
        fonction_representant_legal,
        adresse_representant_legal,
        telephone_morale,
        email_morale,
        activite
      } = cleanData;

      const client = await Client.findByPk(id);
      if (!client) {
        return res.status(404).json({ message: "Client non trouvé" });
      }

      client.denomination = denomination;
      client.adresse_siege = adresse_siege;
      client.nom_representant_legal = nom_representant_legal;
      client.fonction_representant_legal = fonction_representant_legal;
      client.adresse_representant_legal = adresse_representant_legal;
      client.telephone_morale = telephone_morale;
      client.email_morale = email_morale;
      client.activite = activite;

      await client.save();

      return res.status(200).json({
        success: true,
        message: "Client mis à jour avec succès",
        client
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }

  // 📌 Supprimer un client
  static async deleteClient(req, res) {
    try {
      const { id } = req.params;

      const client = await Client.findByPk(id);
      if (!client) {
        return res.status(404).json({ message: "Client non trouvé" });
      }

      await client.destroy();
      return res
        .status(200)
        .json({ success: true, message: "Client supprimé avec succès" });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ success: flase, message: "Erreur interne du serveur" });
    }
  }
}

module.exports = ClientController;
