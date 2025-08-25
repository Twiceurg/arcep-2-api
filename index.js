const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const app = express();
const port = 3008;
const cors = require("cors");
const path = require("path");
const { setIo } = require("./utils/socket"); // <--- import
require("./cron/expirationCron");
require("./cron/notification");

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3001",
      "http://localhost:3004",
      "http://192.168.95.27:3001",
      "http://192.168.95.27:3008",
      "http://192.168.95.23:3004",
      "http://192.168.1.100:3001",
      "http://192.168.21.28:3004"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true
  }
});

setIo(io); // <--- assigner l'instance ici

app.use(
  cors({
    origin: [
      "http://localhost:3001",
      "http://localhost:3004",
      "http://192.168.95.27:3001",
      "http://192.168.95.23:3004",
      "http://192.168.1.100:3001",
      "http://192.168.21.28:3004"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true
  })
);

app.use("/uploads", express.static(path.join(__dirname, "utils", "uploads")));

app.use(express.json());

const ActionRoutes = require("./routes/actions");
const auth = require("./routes/auth");

app.use("/api/auth", auth);
app.use("/api", ActionRoutes);

app.get("/", (req, res) => {
  res.send("Hello, Node.js avec Express!");
});

io.on("connection", (socket) => {
  console.log("Un utilisateur est connecté.", socket.id);

  // socket.emit("notification", { message: "" });

  socket.on("sendNotification", (data) => {
    io.emit("notification", data);
  });

  socket.on("disconnect", () => {
    console.log("Un utilisateur s'est déconnecté.", socket.id);
  });
});

server.listen(port, () => {
  console.log(`Serveur lancé à http://localhost:${port}`);
});
