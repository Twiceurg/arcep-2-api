const { ZoneUtilisation, Utilisation } = require("../../models");

module.exports = {
  async create(req, res) {
    try {
      const { nom, utilisation } = req.body;
      const utilisation_id = utilisation;

      if (!utilisation_id) {
        return res.json({
          success: false,
          message: "utilisation.id est requis."
        });
      }

      const zone = await ZoneUtilisation.create({ nom, utilisation_id });
      res.json({ success: true, data: zone });
    } catch (error) {
      console.error("Erreur création zone :", error);
      res.json({ success: false, message: "Erreur lors de la création." });
    }
  },

  async getAll(req, res) {
    try {
      const zones = await ZoneUtilisation.findAll({
        include: [{ model: Utilisation }]
      });
      res.json({ success: true, data: zones });
    } catch (error) {
      console.error("Erreur récupération zones :", error);
      res.json({ success: false, message: "Erreur lors de la récupération." });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const zone = await ZoneUtilisation.findByPk(id, {
        include: [{ model: Utilisation }]
      });

      if (!zone) {
        return res.json({ success: false, message: "Zone non trouvée." });
      }

      res.json({ success: true, data: zone });
    } catch (error) {
      console.error("Erreur récupération zone :", error);
      res.json({ success: false, message: "Erreur lors de la récupération." });
    }
  },
  async getByUtilisation(req, res) {
    try {
      const { utilisation_id } = req.params;

      if (!utilisation_id) {
        return res.json({
          success: false,
          message: "utilisation_id est requis."
        });
      }

      const zones = await ZoneUtilisation.findAll({
        where: { utilisation_id },
        include: [{ model: Utilisation }]
      });

      res.json({ success: true, data: zones });
    } catch (error) {
      console.error("Erreur récupération zones par utilisation :", error);
      res.json({ success: false, message: "Erreur lors de la récupération." });
    }
  },
  async update(req, res) {
    try {
      const { id } = req.params;
      const { nom, utilisation } = req.body;
      const utilisation_id = utilisation;

      const zone = await ZoneUtilisation.findByPk(id);
      if (!zone) {
        return res.json({ success: false, message: "Zone non trouvée." });
      }

      await zone.update({ nom, utilisation_id });
      res.json({ success: true, data: zone });
    } catch (error) {
      console.error("Erreur mise à jour zone :", error);
      res.json({ success: false, message: "Erreur lors de la mise à jour." });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const zone = await ZoneUtilisation.findByPk(id);

      if (!zone) {
        return res.json({ success: false, message: "Zone non trouvée." });
      }

      await zone.destroy();
      res.json({ success: true, message: "Zone supprimée avec succès." });
    } catch (error) {
      console.error("Erreur suppression zone :", error);
      res.json({ success: false, message: "Erreur lors de la suppression." });
    }
  }
};
