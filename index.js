const express = require("express");
const app = express();
const port = 3008;
const cors = require("cors"); 

// Configuration de CORS
const corsOptions = {
  origin: ["http://localhost:3000", "http://192.168.95.27:3000"], // ✅ Correct
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], 
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
};
require('./cron/expirationCron');


app.use(cors(corsOptions));

// Importation des routes 
const ActionRoutes = require("./routes/actions");
const auth = require("./routes/auth");

// Configuration de express pour gérer les requêtes JSON
app.use(express.json());
 
app.use("/api/auth", auth);
app.use("/api", ActionRoutes);

app.get("/", (req, res) => {
  res.send("Hello, Node.js avec Express!");
});

app.listen(port, () => {
  console.log(`Serveur lancé à http://localhost:${port}`);
});
