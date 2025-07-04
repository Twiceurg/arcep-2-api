// controllers/notificationController.js
const { Notification } = require("../../models");

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]]
    });

    res.json({ success: true, notifications });
  } catch (error) {
    console.error("Erreur lors de la récupération des notifications :", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByPk(id);

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification non trouvée" });
    }

    if (notification.read) {
      return res 
        .json({ success: false, message: "Notification déjà lue" });
    }

    notification.read = true;
    await notification.save();

    res.json({ success: true, message: "Notification marquée comme lue" });
  } catch (error) {
    console.error("Erreur lors de la mise à jour :", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.update(
      { read: true },
      { where: { user_id: userId, read: false } }
    );

    res.json({
      success: true,
      message: "Toutes les notifications marquées comme lues"
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour globale :", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getUnreadNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer uniquement les notifications non lues
    const notifications = await Notification.findAll({
      where: { user_id: userId, read: false },
      order: [["created_at", "DESC"]] // Optionnel : ordonner par date de création
    });

    if (notifications.length === 0) {
      return res
        .json({ success: false, message: "Aucune notification non lue." });
    }

    res.json({ success: true, notifications });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des notifications non lues :",
      error
    );
    res. json({ success: false, message: "Erreur serveur" });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadNotifications
};
