// db.js
const mysql2 = require("mysql2");
const logger = require("./logger");

// create a connection pool
const pool = mysql2.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  socketPath: process.env.DB_SOCKET_PATH,
  connectionLimit: 1000, // Set the maximum number of connections in the pool
});

// acquire a connection from the pool
pool.getConnection((error, connection) => {
  if (error) {
    logger.error("Error acquiring a database connection.");
    logger.debug(error);
  } else {
    logger.info("Acquired a database connection from the pool.");
  }
});

module.exports = pool;
