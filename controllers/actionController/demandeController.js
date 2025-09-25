const { Demande, Client } = require("../../models");

class DemandeController {
  // Création d'une nouvelle demande
  async create(req, res) {
    try {
      const {
        client_id,
        type_demande,
        motif_demande,
        numero_refere,
        type_service,
        type_attribution,
        numero_alternatif,
        type_preference,
        type_utilisation,
        description_service,
        tarification,
        utilisation_cible,
        duree_utilisation,
        reseau_ressources,
        reseau_service_accessible,
        quantite_ressource,
        service_exploitation,
        nom_gestionaire_numerotaion,
        telephone_service_exploitation,
        nom_prenoms,
        profession,
        adresse_physique,
        telephone_physique,
        email_physique,
        pieces_identite,
        description_activites,
        licences,
        etat
      } = req.body;

      const demande = await Demande.create({
        client_id,
        type_demande,
        motif_demande,
        numero_refere,
        numero_alternatif,
        type_preference,
        type_utilisation,
        type_service,
        type_attribution,
        description_service,
        tarification,
        utilisation_cible,
        duree_utilisation,
        reseau_ressources,
        reseau_service_accessible,
        quantite_ressource,
        service_exploitation,
        nom_gestionaire_numerotaion,
        telephone_service_exploitation,
        nom_prenoms,
        profession,
        adresse_physique,
        telephone_physique,
        email_physique,
        pieces_identite,
        description_activites,
        licences,
        etat
      });

      res.json({
        success: true,
        message: "Demande créée avec succès",
        demande
      });
    } catch (error) {
      console.error(error);
      res.json({
        success: false,
        message: "Erreur lors de la création de la demande"
      });
    }
  }

  // Récupérer toutes les demandes
  async getAll(req, res) {
    try {
      // Récupérer les demandes avec les informations du client associées
      const demandes = await Demande.findAll({
        include: [
          {
            model: Client
          }
        ]
      });

      res.json({
        success: true,
        message: "Demandes récupérées avec succès",
        demandes
      });
    } catch (error) {
      console.error(error);
      res.json({
        success: false,
        message: "Erreur lors de la récupération des demandes"
      });
    }
  }

  // Récupérer une demande par son ID
  async getById(req, res) {
    const { id } = req.params;
    try {
      // Recherche de la demande par ID, avec l'inclusion du modèle Client
      const demande = await Demande.findByPk(id, {
        include: [
          {
            model: Client
          }
        ]
      });

      // Vérifie si la demande existe
      if (!demande) {
        return res.json({ success: false, message: "Demande non trouvée" });
      }

      // Si la demande est trouvée, renvoie les données avec un message de succès
      res.json({
        success: true,
        message: "Demande récupérée avec succès",
        demande
      });
    } catch (error) {
      console.error(error);
      // En cas d'erreur, renvoie un message d'erreur général
      res.json({
        success: false,
        message: "Erreur lors de la récupération de la demande"
      });
    }
  }

  // Mettre à jour une demande
  async update(req, res) {
    const { id } = req.params;
    const {
      client_id,
      type_demande,
      motif_demande,
      numero_refere,
      type_service,
      type_attribution,
      numero_alternatif,
      type_preference,
      type_utilisation,
      description_service,
      tarification,
      utilisation_cible,
      duree_utilisation,
      reseau_ressources,
      reseau_service_accessible,
      quantite_ressource,
      service_exploitation,
      nom_gestionaire_numerotaion,
      telephone_service_exploitation,
      nom_prenoms,
      profession,
      adresse_physique,
      telephone_physique,
      email_physique,
      pieces_identite,
      description_activites,
      licences,
      etat
    } = req.body;

    try {
      const demande = await Demande.findByPk(id);

      if (!demande) {
        return res.json({ success: false, message: "Demande non trouvée" });
      }

      await demande.update({
        client_id,
        type_demande,
        motif_demande,
        numero_refere,
        numero_alternatif,
        type_preference,
        type_utilisation,
        type_service,
        type_attribution,
        description_service,
        tarification,
        utilisation_cible,
        duree_utilisation,
        reseau_ressources,
        reseau_service_accessible,
        quantite_ressource,
        service_exploitation,
        nom_gestionaire_numerotaion,
        telephone_service_exploitation,
        nom_prenoms,
        profession,
        adresse_physique,
        telephone_physique,
        email_physique,
        pieces_identite,
        description_activites,
        licences,
        etat: "accepte"
      });

      res.json({
        success: true,
        message: "Demande mise à jour avec succès",
        demande
      });
    } catch (error) {
      console.error(error);
      res.json({
        success: false,
        message: "Erreur lors de la mise à jour de la demande"
      });
    }
  }

  // Supprimer une demande
  async delete(req, res) {
    const { id } = req.params;
    try {
      const demande = await Demande.findByPk(id);

      if (!demande) {
        return res.json({ success: false, message: "Demande non trouvée" });
      }

      await demande.destroy();
      res.json({ success: true, message: "Demande supprimée avec succès" });
    } catch (error) {
      console.error(error);
      res.json({
        success: false,
        message: "Erreur lors de la suppression de la demande"
      });
    }
  }

  //chnager l etat de la demande
  async updateEtat(req, res) {
    try {
      const { id } = req.params; // Récupère l'ID de la demande
      const { etat } = req.body; // Récupère l'état à mettre à jour

      // Vérifie si l'état est valide
      const validStates = ["en attente", "rejete", "traite", "accepte"];
      if (!validStates.includes(etat)) {
        return res. json({ message: "État invalide" });
      }

      // Recherche la demande par son ID
      const demande = await Demande.findByPk(id);
      if (!demande) {
        return res. json({ message: "Demande non trouvée" });
      }

      // Mise à jour de l'état
      demande.etat = etat;
      await demande.save();

      // Réponse succès
      return res. json({
        success: true,
        message: "État de la demande mis à jour avec succès",
        data: demande
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'état :", error);
      return res.json({ message: "Erreur interne du serveur" });
    }
  }
}

module.exports = new DemandeController();
