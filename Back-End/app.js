const express = require("express");
const cors = require("cors");

const morgan = require("morgan");
const path = require("path");

const ErrorController = require("./Controller/errorController");
const session = require("express-session");
const MongoStore = require("connect-mongo");

// ROUTES
const PDFRoutes = require("./Routes/PDFRoutes");
const usersroutes = require("./Routes/UserRoutes");
const IncomingRequest = require("./Routes/IncomingRequestRoute");
const categoryroutes = require("./Routes/CategoryRoutes");
const departmentroutes = require("./Routes/DepartmentRoutes");
const laboratoryroutes = require("./Routes/LaboratoryRoutes");
const Equipmentroutes = require("./Routes/EquipmentRoutes");
const AssignEquipment = require("./Routes/AssignRoutes");
const MaintenanceRoutes = require("./Routes/RequestMaintenanceRoutes");
const MessageRequestRoutes = require("./Routes/MessaRoute");
const MaintenanceTypess = require("./Routes/TypesMaintenancRoute");
const authentic = require("./Routes/authRouter");
const StatisticalRoute = require("./Routes/StatisticalRoute")
const ProblemRoute = require("./Routes/ProblemRoute")
const HistoryRoute = require("./Routes/HistoryRoute")
const PMsMaintenanceRoute = require("./Routes/PMSmaintenanceRoute")
const Pms001 = require("./Routes/PMSroute")
const Pms002 = require("./Routes/PMSroute002")
const Pms003 = require("./Routes/PMSroute003")
const Pms004 = require("./Routes/PMSroute4")
const Pms005 = require("./Routes/PMSroute005")
const Pms006 = require("./Routes/PMSroute006")
const PmsStatistical= require("./Routes/StatisticalPmsRoute")


let app = express();

const logger = function (req, res, next) {
  console.log("Middleware Called");
  next();
};

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.set("trust proxy", true);
app.use(
  session({
    secret: process.env.SECRET_STR,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.CONN_STR,
      ttl: 12 * 60 * 60, // 12 hours in seconds
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "none",
      maxAge: 12 * 60 * 60 * 1000,
    },
    rolling: true,
  }),
);
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  }),
);

app.use(logger);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//importante ito para pag view ng picture sa table .etcc..
const uploadsDir = path.join(__dirname, "..", "uploads");

app.use("/api/v1/users", usersroutes);
app.use("/api/v1/departments", departmentroutes);
app.use("/api/v1/authentication", authentic);
app.use("/api/v1/categorys", categoryroutes);
app.use("/api/v1/laboratory", laboratoryroutes);
app.use("/api/v1/equipment", Equipmentroutes);
app.use("/api/v1/AssignEquipment", AssignEquipment);
app.use("/api/v1/MaintenanceRequest", MaintenanceRoutes);
app.use("/api/v1/TypesMaintenanceRequest", MaintenanceTypess);
app.use("/api/v1/MessageRequest", MessageRequestRoutes);
app.use("/api/v1/IncomingRequests", IncomingRequest);
app.use("/api/v1/GeneratePDF", PDFRoutes);
app.use("/api/v1/statistical", StatisticalRoute);
app.use("/api/v1/problem", ProblemRoute);
app.use("/api/v1/History", HistoryRoute);
app.use("/api/v1/maintenance", PMsMaintenanceRoute);
app.use("/api/v1/Pms", Pms001);
app.use("/api/v1/Pms002", Pms002);
app.use("/api/v1/Pms003", Pms003);
app.use("/api/v1/Pms004", Pms004);
app.use("/api/v1/Pms005", Pms005);
app.use("/api/v1/Pms006", Pms006);
app.use("/api/v1/PmsStatistical", PmsStatistical);
app.use(ErrorController);

module.exports = app;
