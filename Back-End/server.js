const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const mongoose = require("mongoose");
const http = require("http");
const socketIo = require("socket.io");
const { spawn } = require("child_process"); 
const path = require("path");
const os = require("os");
const app = require("./app");
const initDefaultUser = require("./Controller/initDefaultUser");

app.set("trust proxy", true);

// 1. Error Handling
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception! Shutting down...");
  console.error(err);
  process.exit(1);
});

const server = http.createServer(app);

// 2. Socket.io Configuration
const io = socketIo(server, {
  cors: { 
    origin: process.env.FRONTEND_URL || "*", 
    methods: ["GET", "POST","PUT"],
    credentials: true 
  },
  allowEIO3: true,
  transports: ["websocket", "polling"]
});

app.set("io", io);

// 3. Logic for Development vs Production
// SA VPS (Production), itong block na ito ay hindi mag-e-execute ng spawn.
if (process.env.NODE_ENV === "development") {
    const pythonCmd = process.platform === "win32" ? "py" : "python3";
    const desktopPath = path.join(os.homedir(), "Desktop", "RFID-Bridge", "scan.py");

    console.log(`🛠️ Dev Mode: Spawning local Python at ${desktopPath}`);
    const rfidPython = spawn(pythonCmd, [desktopPath]);

    rfidPython.stdout.on('data', (data) => {
        const cardUID = data.toString().trim();
        if (cardUID && cardUID !== "NO_READER") {
            console.log(`Local Scan: ${cardUID}`);
            io.emit("rfid-scanned", { uid: cardUID, timestamp: new Date(), source: "Local-Spawn" });
        }
    });

    rfidPython.stderr.on('data', (data) => console.error(`Python Error: ${data}`));
} else {
    console.log("🚀 Production Mode: Waiting for remote RFID bridge from your Desktop...");
}

// 4. Socket Events (Universal)
global.connectedUsers = {};

io.on("connection", (socket) => {
  console.log("New Connection:", socket.id);

  // Ito ang sasalo ng data galing sa bridge.py ng Desktop mo
  socket.on("rfid-scanned", (data) => {
    console.log("UID received from Remote Desktop:", data.uid);
    // I-broadcast sa Frontend Dashboard
    io.emit("rfid-scanned", { ...data, timestamp: new Date() });
  });

  socket.on("register-user", (linkId, role) => {
    global.connectedUsers[linkId] = { socketId: socket.id, role };
    console.log(`Registered ${role}: ${linkId}`);
  });

  socket.on("disconnect", () => {
    for (const linkId in global.connectedUsers) {
      if (global.connectedUsers[linkId].socketId === socket.id) {
        delete global.connectedUsers[linkId];
        break;
      }
    }
  });
});

// 5. Database & Server Start
mongoose.connect(process.env.CONN_STR)
  .then(async () => {
    console.log("Database connected successfully");
    await initDefaultUser();
    const port = process.env.PORT || 3000;
    server.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((err) => {
    console.error("DB connection error:", err.message);
    process.exit(1);
  });

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection!");
  server.close(() => process.exit(1));
});