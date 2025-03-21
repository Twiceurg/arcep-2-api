const express = require("express");
const ServiceController = require("../controllers/actionController/serviceController");
const PnnController = require("../controllers/actionController/pnnController");
const ClientController = require("../controllers/actionController/clientController");
const AttributionNumeroController = require("../controllers/actionController/attributionNumeroController");
const TypeUtilisationController = require("../controllers/actionController/typeutilisationController");

const router = express.Router();

// 📌 Route pour le CRUD des services
router.post("/services", ServiceController.createService);
router.get("/services", ServiceController.getAllServices);
router.put("/services/:id", ServiceController.updateService);
router.delete("/services/:id", ServiceController.deleteService);

// 📌 Route pour le CRUD des PNN
router.post("/pnns", PnnController.createPnn);
router.get("/pnns", PnnController.getAllPnns);
router.put("/pnns/:id", PnnController.updatePnn);
router.get("/pnns/:id", PnnController.getPnnById);
router.delete("/pnns/:id", PnnController.deletePnn);
router.get("/pnns/service/:serviceId", PnnController.getPnnsByServiceId);

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

module.exports = router;
