const express = require("express");
const ServiceController = require("../controllers/actionController/serviceController");
const PnnController = require("../controllers/actionController/pnnController");
const ClientController = require("../controllers/actionController/clientController");
const AttributionNumeroController = require("../controllers/actionController/attributionNumeroController");
const TypeUtilisationController = require("../controllers/actionController/typeutilisationController");
const CategoriesController = require("../controllers/actionController/categorieController");
const utilisationController = require("../controllers/actionController/utilisationController");
const demandeController = require("../controllers/actionController/demandeController");
const RapportController = require("../controllers/actionController/rapportController");
const RenouvellementController = require("../controllers/actionController/RenouvellementController");
const controller = require("../controllers/actionController/NumeroAttribueController");
const authenticateToken = require("../middleware/authenticateToken");
const historiqueAttributionController = require("../controllers/actionController/historiqueAtributionController");
const upload = require("../utils/multer");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadNotifications
} = require("../controllers/actionController/notificationController");
const {
  createUSSD,
  getAllUSSDs,
  getUSSDById,
  updateUSSD,
  deleteUSSD,
  toggleStatusUSSD
} = require("../controllers/actionController/ussdController");
const AttributionUssdController = require("../controllers/actionController/attribuerUssd");
const {
  getAllUssdAttributions,
  libererUssdAttribue
} = require("../controllers/actionController/ussdAttribuerListe");
const historiqueUSSDAttributionController = require("../controllers/actionController/historiqueUSSDAttributionController");
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

// 📌 Route pour le CRUD des services
router.post("/services", ServiceController.createService);
router.get("/services", ServiceController.getAllServices);
router.put("/services/:id", ServiceController.updateService);
router.delete("/services/:id", ServiceController.deleteService);
router.get(
  "/services/category/:category_id",
  ServiceController.getServicesByCategory
);

// 📌 Route pour le CRUD des services
router.post("/category", CategoriesController.createCategorie);
router.get("/category", CategoriesController.getAllCategorie);
router.put("/category/:id", CategoriesController.updateCategorie);
router.delete("/category/:id", CategoriesController.deleteCategorie);

// 📌 Route pour le CRUD des PNN
router.post("/pnns", PnnController.createPnn);
router.get("/pnns", PnnController.getAllPnns);
router.put("/pnns/:id", PnnController.updatePnn);
router.get("/pnns/:id", PnnController.getPnnById);
router.delete("/pnns/:id", PnnController.deletePnn);
router.get("/pnns/service/:serviceId", PnnController.getPnnsByServiceId);
router.patch("/pnns/:id/toggle", PnnController.toggleEtat);
router.get(
  "/pnns/utilisation/:utilisationId",
  PnnController.getPnnsByUtilisationId
);

// 📌 Route pour le CRUD des clients
router.post("/clients", ClientController.createClient);
router.get("/clients", ClientController.getAllClients);
router.get("/clients/:id", ClientController.getClientById);
router.put("/clients/:id", ClientController.updateClient);
router.delete("/clients/:id", ClientController.deleteClient);

// 📌 Route pour le CRUD des types d'utilisations
router.post(
  "/type-utilisation",
  TypeUtilisationController.createTypeUtilisation
);
router.get(
  "/type-utilisation",
  TypeUtilisationController.getAllTypesUtilisation
);
router.get(
  "/type-utilisation/:id",
  TypeUtilisationController.getTypeUtilisationById
);
router.put(
  "/type-utilisation/:id",
  TypeUtilisationController.updateTypeUtilisation
);
router.delete(
  "/type-utilisation/:id",
  TypeUtilisationController.deleteTypeUtilisation
);

// 📌 Route pour le CRUD des attributions
router.post(
  "/attribution",
  authenticateToken,
  AttributionNumeroController.createAttribution
);
router.get(
  "/attribution/bloc",
  AttributionNumeroController.getAllAttributionsBloc
);
router.get("/attribution", AttributionNumeroController.getAllAttributions);
router.get("/attribution/:id", AttributionNumeroController.getAttributionById);
router.get("/historiques", AttributionNumeroController.getAllHistoriques);

router.get(
  "/attributions/:id/historiques",
  AttributionNumeroController.getHistoriqueByAttributionId
);

router.get(
  "/attribution/:id/decisions",
  AttributionNumeroController.getAttributionDecisions
);
router.put(
  "/attribution/:id",
  upload.single("file"),
  authenticateToken,
  AttributionNumeroController.updateAttribution
);
router.put(
  "/attribution/reclamation/:id",
  upload.single("file"),
  authenticateToken,
  AttributionNumeroController.reclamerAttribution
);
router.post(
  "/attribution/suspension",
  authenticateToken,
  AttributionNumeroController.appliquerSuspension
);
router.delete(
  "/attribution/:id",
  AttributionNumeroController.deleteAttribution
);
router.get(
  "/attribution/pnn/:pnn_id",
  AttributionNumeroController.getAssignedNumbersByPnn
);
router.get(
  "/attribution/client/:client_id",
  AttributionNumeroController.getAttributionByClientId
);
router.put(
  "/attribution/:id/assignReference",
  upload.single("file"),
  AttributionNumeroController.assignReference
);
router.put(
  "/attribution/:id/reservation",
  upload.single("file"),
  AttributionNumeroController.assignReferenceDeReclamtion
);

// 📌 Route pour créer une nouvelle utilisation
router.post("/utilisations", utilisationController.create);
router.get("/utilisations", utilisationController.getAll);
router.get("/utilisations/:id", utilisationController.getById);
router.get(
  "/utilisations/service/:service_id",
  utilisationController.getUtilisationByService
);
router.put("/utilisations/:id", utilisationController.update);
router.delete("/utilisations/:id", utilisationController.delete);

// 📌 Route pour créer une nouvelle demande
router.post("/demandes", demandeController.create);
router.get("/demandes", demandeController.getAll);
router.get("/demandes/:id", demandeController.getById);
router.put("/demandes/:id", demandeController.update);
router.delete("/demandes/:id", demandeController.delete);
router.put("/demandes/:id/etat", demandeController.updateEtat);

// 📌 CRUD des rapports
router.post("/rapports", RapportController.createRapport);
router.get("/rapports", RapportController.getAllRapports);
router.get("/rapports/:id", RapportController.getRapportById);
router.put("/rapports/:id", RapportController.updateRapport);
router.delete("/rapports/:id", RapportController.deleteRapport);
router.get(
  "/rapports/attribution/:attribution_id",
  RapportController.getRapportsByAttribution
);

// 🔹 Route pour créer un renouvellement
router.post(
  "/renouvellements",
  upload.single("fichier"),
  RenouvellementController.renewAttribution
);
router.get("/renouvellements", RenouvellementController.getAllRenouvellements);
router.get(
  "/renouvellements/:id",
  RenouvellementController.getRenouvellementById
);
router.put(
  "/renouvellements/:id",
  RenouvellementController.updateRenouvellement
);
router.delete(
  "/renouvellements/:id",
  RenouvellementController.deleteRenouvellement
);

//fontion pour l attibution de numero
router.get("/numeros", controller.getAllNumerosAvecAttribution);
router.put("/numeros/:id/liberer", controller.libererNumeroAttribue);

//hisotrique
router.get(
  "/historique/:attribution_id",
  historiqueAttributionController.getHistoriqueByAttribution
);
router.post(
  "/historique/suspension",
  authenticateToken,
  upload.single("fichier"),
  historiqueAttributionController.appliquerSuspension
);
router.post(
  "/historique/retrait",
  authenticateToken,
  upload.single("fichier"),
  historiqueAttributionController.appliquerRetrait
);
router.post(
  "/historique/resiliation",
  authenticateToken,
  upload.single("fichier"),
  historiqueAttributionController.appliquerRésiliation
);
router.put(
  "/historique/assign-reference/:id",
  upload.single("file"),
  historiqueAttributionController.assignReference
);

//Notification

// Route pour récupérer les notifications
router.get("/notifications", authenticateToken, getNotifications);
router.patch("/notifications/:id/read", authenticateToken, markAsRead);
router.patch("/notifications/read-all", authenticateToken, markAllAsRead);
router.get("/notifications/unread", authenticateToken, getUnreadNotifications);

//Tout ce qui concerne les ussd

// Route POST pour créer un USSD
router.post("/ussds", createUSSD);

router.get("/ussds", getAllUSSDs);
router.get("/ussds/:id", getUSSDById);
router.put("/ussds/:id", updateUSSD);
router.delete("/ussds/:id", deleteUSSD);
router.patch("/ussds/:id/status", toggleStatusUSSD);

// Route pour créer une attribution USSD

router.post(
  "/ussd-attribution/create-ussd",
  authenticateToken, // Middleware d'authentification
  AttributionUssdController.createUssdAttribution
);

// Route pour obtenir toutes les attributions USSD
router.get(
  "/ussd-attribution/get-ussds",
  authenticateToken, // Middleware d'authentification
  AttributionUssdController.getAllUssdAttributions
);

// Route pour obtenir une attribution USSD par ID
router.get(
  "/ussd-attribution/get-ussd/:id",
  authenticateToken, // Middleware d'authentification
  AttributionUssdController.getUssdAttributionById
);

router.put(
  "/ussd-attribution/:id/assign-ussd-reference",
  authenticateToken,
  upload.single("file"),
  AttributionUssdController.assignUssdReference
);
router.put(
  "/ussd-attribution/:id/assign-ussd-reclmation-reference",
  authenticateToken,
  upload.single("file"),
  AttributionUssdController.assignUssdReservationReference
);
router.get(
  "/ussd-attribution/:ussd_id/assigned-numbers",
  AttributionUssdController.getAssignedNumbersByUssd
);
router.put(
  "/ussd-attribution/:id/reclamer",
  authenticateToken,
  upload.single("fichier"), 
  AttributionUssdController.reclamerUssdAttribution
);


router.get(
  "/ussd-attribution/:id/decisionsUSSD",
  AttributionUssdController.getAttributionUssdDecisions
);

// Vous pouvez ajouter des routes pour la mise à jour et la suppression si nécessaire
// router.put(
//   "/update-ussd/:id",
//   authenticateToken, // Middleware d'authentification
//   AttributionUssdController.updateUssdAttribution
// );

// router.delete(
//   "/delete-ussd/:id",
//   authenticateToken, // Middleware d'authentification
//   AttributionUssdController.deleteUssdAttribution
// );

router.get("/ussdsAtribuer", getAllUssdAttributions);

// Route pour libérer un USSD attribué en fonction de son ID
router.put("/ussdsAtribuer/liberer/:id", libererUssdAttribue);

// Récupérer les historiques d'une attribution
router.get(
  "/historiqueUssd/:ussd_attribution_id",
  authenticateToken,
  historiqueUSSDAttributionController.getUssdHistoriqueByAttribution
);

// Appliquer une suspension
router.post(
  "/historiqueUssd/suspension",
  authenticateToken,
  upload.single("fichier"),
  historiqueUSSDAttributionController.appliquerUssdSuspension
);

// Appliquer un retrait
router.post(
  "/historiqueUssd/retrait",
  authenticateToken,
  upload.single("fichier"),
  historiqueUSSDAttributionController.appliquerUssdRetrait
);

// Appliquer une résiliation
router.post(
  "/historiqueUssd/resiliation",
  authenticateToken,
  upload.single("fichier"),
  historiqueUSSDAttributionController.appliquerUssdRésiliation
);

// Appliquer une référence à une modification historique
router.post(
  "/historiqueUssd/appliquer-decision/:id",
  authenticateToken,
  upload.single("file"),
  historiqueUSSDAttributionController.assignUssdReference
);

router.get('/dashboard/:utilisationId/attributions', dashboardController.getTotalAndRemainingNumbers);


module.exports = router;
