const express = require("express");
const ServiceController = require("../controllers/actionController/serviceController");
const PnnController = require("../controllers/actionController/pnnController");
const ClientController = require("../controllers/actionController/clientController");
const AttributionNumeroController = require("../controllers/actionController/attributionNumeroController");
const TypeUtilisationController = require("../controllers/actionController/typeutilisationController");
const CategoriesController = require("../controllers/actionController/categorieController");
const utilisationController = require("../controllers/actionController/utilisationController");
const demandeController = require("../controllers/actionController/demandeController");

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
router.post("/attribution", AttributionNumeroController.createAttribution);
router.get("/attribution", AttributionNumeroController.getAllAttributions);
router.get("/attribution/:id", AttributionNumeroController.getAttributionById);
router.put("/attribution/:id", AttributionNumeroController.updateAttribution);
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

module.exports = router;
