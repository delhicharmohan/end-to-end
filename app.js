const express = require("express");
const createError = require("http-errors");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
const mysql = require("mysql2/promise");

var app = express();

// Behind a proxy (Render), trust X-Forwarded-* headers so req.ip is correct
app.set("trust proxy", true);

var corsOptions = {
  origin: [
    "http://localhost:8080",
    "http://localhost:3000",
    "http://192.168.1.54:3000",
    "http://192.168.1.54:8080",
    "https://api.wizpayy.com",
    "http://wizpayy.com",
    "https://zinggale.com",
    "https://p2p-instance.de.r.appspot.com",
    "https://wizpay-fullstack.onrender.com",
    "chrome-extension://lcdeifkjnmaenbbdeimjoihapmhecdke",
    "https://20240328t022808-dot-best-live-404609.uc.r.appspot.com"
  ],
  credentials: true,
};

// Configure database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Fetch allowed origins dynamically from the database and update CORS options
const updateCorsOptions = async () => {
  try {
    const connection = await pool.getConnection();
    const [rows, fields] = await connection.query("SELECT DISTINCT `extensionId` FROM `users` WHERE extensionId != '' AND extensionId IS NOT NULL");
    connection.release();
    const allowedOrigins = rows.map((row) => 'chrome-extension://' + row.extensionId);
    corsOptions.origin = [
      ...corsOptions.origin.filter(origin => !allowedOrigins.includes(origin)), // Remove duplicates
      ...allowedOrigins
    ];
  } catch (error) {
    //console.error("Error updating CORS options: ", error);
  }
};

// Call the function to update CORS options
updateCorsOptions();

app.use(cors(corsOptions));
app.use(express.static(path.join(__dirname, "/views"), { maxAge: 0 }));

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const mobileRouter = require("./routes/mobile");
const extensionRouter = require("./routes/extension");
const subadminRouter = require("./routes/subadmin");
const vendorRouter = require("./routes/vendor");
const clientRouter = require("./routes/clients");
const orderRouter = require("./routes/order");
const statusRouter = require("./routes/status");
const callbackRouter = require("./routes/callback");
const reportRouter = require("./routes/report");
const smsRouter = require("./routes/sms");
const ticketRouter = require("./routes/ticket");
const orderCreatorRouter = require("./routes/order-creator");
const supportUserRouter = require("./routes/support-user");
const login = require("./routes/login");
const logout = require("./routes/logout");
const logger = require("./logger");
const requestLogger = require("./requestLogger");
const checkAuth = require("./helpers/middleware/checkAuth");
const whitelistMiddleware = require("./helpers/middleware/whitelistMiddleware");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(requestLogger);
app.use(whitelistMiddleware);

require("./helpers/cron/index")

app.use("/api/v1/", indexRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/mobile", mobileRouter);
app.use("/api/v1/extension", extensionRouter);
app.use("/api/v1/subadmin", subadminRouter);
app.use("/api/v1/vendor", vendorRouter);
app.use("/api/v1/clients", clientRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/status", statusRouter);
app.use("/api/v1/callback", callbackRouter);
app.use("/api/v1/reports", reportRouter);
app.use("/api/v1/sms", smsRouter);
app.use("/api/v1/ticket", ticketRouter);
app.use("/api/v1/order-creator", orderCreatorRouter);
app.use("/api/v1/support-user", supportUserRouter);
app.use("/api/v1/login", login);
app.post("/api/v1/logout", checkAuth, logout);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/views/index.html"));
});

// Endpoint for updating CORS options dynamically
app.post("/api/v1/update-cors", async (req, res, next) => {
  try {
    await updateCorsOptions();
    res.status(200).send("CORS options updated successfully");
  } catch (error) {
    next(error);
  }
});

// Cache-busting middleware
app.use((req, res, next) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  next();
});

// catch 404
app.use(function (req, res, next) {
  return res.status(404).json({
    message: "Page not found.",
  });
});

module.exports = app;
