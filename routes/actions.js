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
  toggleStatusUSSD,
  getUSSDByUtilisationId
} = require("../controllers/actionController/ussdController");
const AttributionUssdController = require("../controllers/actionController/attribuerUssd");
const {
  getAllUssdAttributions,
  libererUssdAttribue
} = require("../controllers/actionController/ussdAttribuerListe");
const historiqueUSSDAttributionController = require("../controllers/actionController/historiqueUSSDAttributionController");
const dashboardController = require("../controllers/dashboardController");
const {
  renewUssdAttribution,
  getAllUssdRenouvellement,
  getUssdRenouvellementById
} = require("../controllers/actionController/RenouvelementUssdController");
const RapportUssdController = require("../controllers/actionController/rapportUssdController");
const authorizeRole = require("../middleware/authorizeRole");
const zoneUtilisationController = require("../controllers/actionController/zoneUtilisationController");

const router = express.Router();

// 📌 Route pour le CRUD des services
router.post(
  "/services",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  ServiceController.createService
);
router.get(
  "/services",
  authenticateToken,
  authorizeRole("admin", "superadmin", "user"),
  ServiceController.getAllServices
);
router.put(
  "/services/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  ServiceController.updateService
);
router.delete(
  "/services/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  ServiceController.deleteService
);
router.get(
  "/services/category/:category_id",
  authenticateToken,
  authorizeRole("admin", "superadmin", "user"),
  ServiceController.getServicesByCategory
);
//Crud des zones d utilisations

router.post(
  "/zones-utilisation",
  authorizeRole("superadmin", "admin"),
  authenticateToken,
  zoneUtilisationController.create
);
router.get(
  "/zones-utilisation",
  authorizeRole("superadmin", "admin", "user"),
  authenticateToken,
  zoneUtilisationController.getAll
);
router.get(
  "/zones-utilisation/utilisation/:utilisation_id",
  authorizeRole("superadmin", "admin", "user"),
  authenticateToken,
  zoneUtilisationController.getByUtilisation
);

router.get(
  "/zones-utilisation/:id",
  authorizeRole("superadmin", "admin", "user"),
  authenticateToken,
  zoneUtilisationController.getById
);
router.put(
  "/zones-utilisation/:id",
  authorizeRole("superadmin", "admin"),
  authenticateToken,
  zoneUtilisationController.update
);
router.delete(
  "/zones-utilisation/:id",
  authorizeRole("superadmin", "admin"),
  authenticateToken,
  zoneUtilisationController.delete
);

// 📌 Route pour le CRUD des services
router.post(
  "/category",
  authorizeRole("superadmin", "admin"),
  authenticateToken,
  CategoriesController.createCategorie
);
router.get(
  "/category",
  authenticateToken,
  authorizeRole("admin", "superadmin", "user"),
  CategoriesController.getAllCategorie
);
router.put(
  "/category/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  CategoriesController.updateCategorie
);
router.delete(
  "/category/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  CategoriesController.deleteCategorie
);

// 📌 Route pour le CRUD des PNN
router.post(
  "/pnns",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  PnnController.createPnn
);
router.get(
  "/pnns",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  PnnController.getAllPnns
);
router.put(
  "/pnns/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  PnnController.updatePnn
);
router.get(
  "/pnns/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  PnnController.getPnnById
);
router.delete(
  "/pnns/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  PnnController.deletePnn
);
router.get(
  "/pnns/service/:serviceId",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  PnnController.getPnnsByServiceId
);
router.patch(
  "/pnns/:id/toggle",
  authorizeRole("superadmin", "admin"),
  PnnController.toggleEtat
);
router.get(
  "/pnns/utilisation/:utilisationId",
  authorizeRole("admin", "user", "superadmin"),
  authenticateToken,
  PnnController.getPnnsByUtilisationId
);
router.get(
  "/pnns/zone/:zoneId",
  authorizeRole("admin", "user", "superadmin"),
  authenticateToken,
  PnnController.getPnnsByZoneId
);

// 📌 Route pour le CRUD des clients
router.post(
  "/clients",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  ClientController.createClient
);
router.get(
  "/clients",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  ClientController.getAllClients
);
router.get(
  "/clients/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  ClientController.getClientById
);
router.put(
  "/clients/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  ClientController.updateClient
);
router.delete(
  "/clients/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  ClientController.deleteClient
);

// 📌 Route pour le CRUD des types d'utilisations
router.post(
  "/type-utilisation",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  TypeUtilisationController.createTypeUtilisation
);
router.get(
  "/type-utilisation",
  authenticateToken,
  authorizeRole("admin", "user", "superadmin"),
  TypeUtilisationController.getAllTypesUtilisation
);
router.get(
  "/type-utilisation/:id",
  authenticateToken,
  authorizeRole("admin", "user", "superadmin"),
  TypeUtilisationController.getTypeUtilisationById
);
router.put(
  "/type-utilisation/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  TypeUtilisationController.updateTypeUtilisation
);
router.delete(
  "/type-utilisation/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  TypeUtilisationController.deleteTypeUtilisation
);

// 📌 Route pour le CRUD des attributions
router.post(
  "/attribution",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  AttributionNumeroController.createAttribution
);
router.get(
  "/attribution/all",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  AttributionNumeroController.getAllAttributions
);
router.get(
  "/attribution/bloc",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  AttributionNumeroController.getAllAttributionsBloc
);
router.get(
  "/attribution/blocParOperateur",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  AttributionNumeroController.getAllAttributionsBlocParOperateur
);
router.get(
  "/attribution",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  AttributionNumeroController.getAttributions
);
router.get(
  "/attribution/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  AttributionNumeroController.getAttributionById
);
router.get(
  "/historiques",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user", "superadmin"),
  AttributionNumeroController.getAllHistoriques
);

router.get(
  "/attributions/:id/historiques",
  authenticateToken,
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  AttributionNumeroController.getHistoriqueByAttributionId
);

router.get(
  "/attribution/:id/decisions",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  AttributionNumeroController.getAttributionDecisions
);
router.put(
  "/attribution/:id",
  upload.fields([
    { name: "fichier", maxCount: 1 },
    { name: "decision_file_url", maxCount: 1 }
  ]),
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  AttributionNumeroController.updateAttribution
);
router.put(
  "/attribution/reclamation/:id",
  upload.fields([
    { name: "fichier", maxCount: 1 },
    { name: "decision_file_url", maxCount: 1 }
  ]),
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  AttributionNumeroController.reclamerAttribution
);

router.put(
  "/attribution/corrigerAttribution/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  AttributionNumeroController.corrigerAttribution
);

router.post(
  "/attribution/suspension",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  AttributionNumeroController.appliquerSuspension
);
router.delete(
  "/attribution/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  AttributionNumeroController.deleteAttribution
);
router.get(
  "/attribution/pnn/:pnn_id",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  AttributionNumeroController.getAssignedNumbersByPnn
);

router.get(
  "/assigned-numbers/ussd",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  AttributionNumeroController.getAssignedNumbersByUssd
);

router.get(
  "/attribution/client/:client_id",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  AttributionNumeroController.getAttributionByClientId
);
router.put(
  "/attribution/:id/assignReference",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  upload.single("file"),
  AttributionNumeroController.assignReference
);
router.put(
  "/attribution/:id/reservation",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  upload.single("file"),
  AttributionNumeroController.assignReferenceDeReclamtion
);

// 📌 Route pour créer une nouvelle utilisation
router.post(
  "/utilisations",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  utilisationController.create
);
router.get(
  "/utilisations",
  authorizeRole("admin", "user", "superadmin"),
  authenticateToken,
  utilisationController.getAll
);
router.get(
  "/utilisations/:id",
  authenticateToken,
  authorizeRole("admin", "user", "superadmin"),
  utilisationController.getById
);
router.get(
  "/utilisations/service/:service_id",
  authenticateToken,
  authorizeRole("admin", "user", "superadmin"),
  utilisationController.getUtilisationByService
);
router.put(
  "/utilisations/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  utilisationController.update
);
router.delete(
  "/utilisations/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  utilisationController.delete
);

// 📌 Route pour créer une nouvelle demande
router.post(
  "/demandes",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  demandeController.create
);
router.get(
  "/demandes",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  demandeController.getAll
);
router.get(
  "/demandes/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  demandeController.getById
);
router.put(
  "/demandes/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  demandeController.update
);
router.delete(
  "/demandes/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  demandeController.delete
);
router.put(
  "/demandes/:id/etat",
  authorizeRole("superadmin", "admin"),
  authenticateToken,
  demandeController.updateEtat
);

// 📌 CRUD des rapports
router.post(
  "/rapports",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  RapportController.createRapport
);
router.get(
  "/rapports",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  RapportController.getAllRapports
);
router.get(
  "/rapports/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  RapportController.getRapportById
);
router.put(
  "/rapports/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  RapportController.updateRapport
);
router.delete(
  "/rapports/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  RapportController.deleteRapport
);
router.get(
  "/rapports/attribution/:attribution_id",

  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  RapportController.getRapportsByAttribution
);

// 🔹 Route pour créer un renouvellement
router.post(
  "/renouvellements",

  authenticateToken,
  upload.single("fichier"),
  authorizeRole("superadmin", "admin"),
  RenouvellementController.renewAttribution
);
router.get(
  "/renouvellements",

  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  RenouvellementController.getAllRenouvellements
);
router.get(
  "/renouvellements/:id",

  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  RenouvellementController.getRenouvellementById
);
router.put(
  "/renouvellements/:id",

  authenticateToken,
  authorizeRole("superadmin", "admin"),
  RenouvellementController.updateRenouvellement
);
router.delete(
  "/renouvellements/:id",

  authenticateToken,
  authorizeRole("superadmin", "admin"),
  RenouvellementController.deleteRenouvellement
);

//fontion pour l attibution de numero
router.get(
  "/numeros",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  controller.getAllNumerosAvecAttribution
);
router.get(
  "/numeros/retraits",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  controller.getNumerosAvecRetrait
);
router.get(
  "/numeros/count-in-range",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  controller.countAssignedInRange
);
router.get(
  "/numeros/count-by-pnn/:pnnId",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  controller.countAttributionGapByPnn
);

router.get(
  "/ussd/count-by-digit-prefix",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  controller.countUssdAssignedByDigitAndPrefix
);

router.get(
  "/ussd/gap-by-digit-prefix",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  controller.countUssdGapByDigitAndPrefix
);
router.put(
  "/numeros/:id/liberer",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  controller.libererNumeroAttribue
);

//hisotrique
router.get(
  "/historique/:attribution_id",
  authenticateToken,
  authorizeRole("admin", "user", "superadmin"),
  historiqueAttributionController.getHistoriqueByAttribution
);

router.post(
  "/historique/suspension",
  authorizeRole("superadmin", "admin"),
  authenticateToken,
  upload.fields([
    { name: "fichier", maxCount: 1 },
    { name: "decision_file", maxCount: 1 }
  ]),
  historiqueAttributionController.appliquerSuspension
);

router.post(
  "/historique/retrait",
  authorizeRole("superadmin", "admin"),
  authenticateToken,
  upload.fields([
    { name: "fichier", maxCount: 1 },
    { name: "decision_file", maxCount: 1 }
  ]),
  historiqueAttributionController.appliquerRetrait
);

router.post(
  "/historique/resiliation",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  upload.fields([
    { name: "fichier", maxCount: 1 },
    { name: "decision_file", maxCount: 1 }
  ]),
  historiqueAttributionController.appliquerRésiliation
);

router.put(
  "/historique/assign-reference/:id",
  upload.single("file"),
  authorizeRole("superadmin", "admin"),
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
router.post(
  "/ussds",
  authenticateToken,
  authorizeRole("superadmin"),
  createUSSD
);

router.get(
  "/ussds",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  getAllUSSDs
);
router.get(
  "/ussds/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  getUSSDById
);
router.put(
  "/ussds/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  updateUSSD
);
router.delete(
  "/ussds/:id",
  authenticateToken,
  authorizeRole("superadmin"),
  deleteUSSD
);
router.patch(
  "/ussds/:id/status",
  authenticateToken,
  authorizeRole("superadmin"),
  toggleStatusUSSD
);
router.get(
  "/ussds/utilisation/:utilisation_id",
  authenticateToken,
  authorizeRole("superadmin", "admin", "user"),
  getUSSDByUtilisationId
);

// Route pour créer une attribution USSD

router.post(
  "/ussd-attribution/create-ussd",
  authorizeRole("superadmin", "admin", "user"),
  authenticateToken,
  authenticateToken, // Middleware d'authentification
  AttributionUssdController.createUssdAttribution
);

// Route pour obtenir toutes les attributions USSD
router.get(
  "/ussd-attribution/get-ussds",
  authorizeRole("superadmin", "admin", "user"),
  authenticateToken,
  authenticateToken, // Middleware d'authentification
  AttributionUssdController.getAllUssdAttributions
);

// Route pour obtenir une attribution USSD par ID
router.get(
  "/ussd-attribution/get-ussd/:id",
  authorizeRole("superadmin", "admin", "user"),
  authenticateToken,
  authenticateToken, // Middleware d'authentification
  AttributionUssdController.getUssdAttributionById
);

router.put(
  "/ussd-attribution/:id/assign-ussd-reference",
  authenticateToken,
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  upload.single("file"),
  AttributionUssdController.assignUssdReference
);
router.put(
  "/ussd-attribution/:id/assign-ussd-reclmation-reference",
  authenticateToken,
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  upload.single("file"),
  AttributionUssdController.assignUssdReservationReference
);
router.get(
  "/ussd-attribution/:ussd_id/assigned-numbers",
  authorizeRole("superadmin", "admin", "user"),
  authenticateToken,
  AttributionUssdController.getAssignedNumbersByUssd
);
router.put(
  "/ussd-attribution/:id/reclamer",
  authenticateToken,
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  upload.single("fichier"),
  AttributionUssdController.reclamerUssdAttribution
);

router.get(
  "/ussd-attribution/:id/decisionsUSSD",
  authorizeRole("superadmin", "admin", "user"),
  authenticateToken,
  AttributionUssdController.getAttributionUssdDecisions
);

router.get(
  "/ussd-attribution/historiques",
  authorizeRole("superadmin", "admin", "user", "superadmin"),
  authenticateToken,
  AttributionUssdController.getAllUssdHistoriques
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

router.get(
  "/ussdsAtribuer",
  authorizeRole("admin", "superadmin", "user"),
  authenticateToken,
  getAllUssdAttributions
);

// Route pour libérer un USSD attribué en fonction de son ID
router.put(
  "/ussdsAtribuer/liberer/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  libererUssdAttribue
);

// Récupérer les historiques d'une attribution
router.get(
  "/historiqueUssd/:ussd_attribution_id",
  authenticateToken,
  authenticateToken,
  authorizeRole("admin", "superadmin", "user"),
  historiqueUSSDAttributionController.getUssdHistoriqueByAttribution
);

// Appliquer une suspension
router.post(
  "/historiqueUssd/suspension",
  authorizeRole("superadmin", "admin", "user"),
  authenticateToken,
  upload.single("fichier"),
  historiqueUSSDAttributionController.appliquerUssdSuspension
);

// Appliquer un retrait
router.post(
  "/historiqueUssd/retrait",
  authorizeRole("superadmin", "admin", "user"),
  authenticateToken,
  upload.single("fichier"),
  historiqueUSSDAttributionController.appliquerUssdRetrait
);

// Appliquer une résiliation
router.post(
  "/historiqueUssd/resiliation",
  authorizeRole("superadmin", "admin"),
  authenticateToken,
  upload.single("fichier"),
  historiqueUSSDAttributionController.appliquerUssdRésiliation
);

// Appliquer une référence à une modification historique
router.post(
  "/historiqueUssd/appliquer-decision/:id",
  authorizeRole("superadmin", "admin"),
  authenticateToken,
  upload.single("file"),
  historiqueUSSDAttributionController.assignUssdReference
);
router.post(
  "/ussd/renouvellements",
  authenticateToken,
  upload.single("fichier"),
  authorizeRole("superadmin", "admin"),
  renewUssdAttribution
);
router.get(
  "/ussd/renouvellements",
  authenticateToken,
  authorizeRole("admin", "superadmin", "user"),
  getAllUssdRenouvellement
);
router.get(
  "/ussd/renouvellements/:id",
  authenticateToken,
  authorizeRole("admin", "superadmin", "user"),
  getUssdRenouvellementById
);

router.get(
  "/dashboard/:utilisationId/attributions",
  authenticateToken,
  authorizeRole("admin", "user", "superadmin"),
  dashboardController.getTotalAndRemainingNumbers
);
router.get(
  "/dashboard/:utilisationId/Actionattributions",
  authenticateToken,
  authorizeRole("admin", "user", "superadmin"),
  dashboardController.getTotalAndRemainingNumbersAction
);
router.get(
  "/dashboard",
  authenticateToken,
  authorizeRole("admin", "user", "superadmin"),
  dashboardController.getAllTotalAndRemainingNumbers
);

router.post(
  "/rapport-ussd/",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  RapportUssdController.createRapportUssd
);
router.get(
  "/rapport-ussd/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  RapportUssdController.getRapportUssdById
);
router.get(
  "/rapport-ussd/",
  authenticateToken,
  authorizeRole("admin", "superadmin", "user"),
  RapportUssdController.getAllRapportUssds
);
router.get(
  "/rapport-ussd/attribution/:attribution_id",
  authenticateToken,
  authorizeRole("admin", "superadmin", "user"),
  RapportUssdController.getRapportsUssdByAttribution
);
router.put(
  "/rapport-ussd/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  RapportUssdController.updateRapportUssd
);
router.delete(
  "/rapport-ussd/:id",
  authenticateToken,
  authorizeRole("superadmin", "admin"),
  RapportUssdController.deleteRapportUssd
);

router.get("/dashboard/TableauGlobal", dashboardController.TableauRecap);
router.get(
  "/dashboard/TableauGlobalParUtilisation",
  dashboardController.getHistoriqueAttributionsParUtilisation
);
router.get(
  "/dashboard/TableauGlobalParSVA",
  dashboardController.getHistoriqueSVA
);

module.exports = router;
