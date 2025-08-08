"use strict";

const logger = require("./logger");

const createConnectorIAMAuthnPool = require("./connect-connector-auto-iam-authn.js");
const createConnectorPool = require("./connect-connector.js");
const createTcpPool = require("./connect-tcp.js");
const createUnixSocketPool = require("./connect-unix.js");

async function accessSecretVersion(secretName) {
  const [version] = await client.accessSecretVersion({ name: secretName });
  return version.payload.data;
}

const createPool = async () => {
  const config = {
    // [START cloud_sql_mysql_mysql2_limit]
    // 'connectionLimit' is the maximum number of connections the pool is allowed
    // to keep at once.
    connectionLimit: 100,
    // [END cloud_sql_mysql_mysql2_limit]

    // [START cloud_sql_mysql_mysql2_timeout]
    // 'connectTimeout' is the maximum number of milliseconds before a timeout
    // occurs during the initial connection to the database.
    connectTimeout: 10000, // 10 seconds
    // 'acquireTimeout' is the maximum number of milliseconds to wait when
    // checking out a connection from the pool before a timeout error occurs.
    acquireTimeout: 10000, // 10 seconds
    // 'waitForConnections' determines the pool's action when no connections are
    // free. If true, the request will queued and a connection will be presented
    // when ready. If false, the pool will call back with an error.
    waitForConnections: true, // Default: true
    // 'queueLimit' is the maximum number of requests for connections the pool
    // will queue at once before returning an error. If 0, there is no limit.
    queueLimit: 0, // Default: 0
    // [END cloud_sql_mysql_mysql2_timeout]

    // [START cloud_sql_mysql_mysql2_backoff]
    // The mysql module automatically uses exponential delays between failed
    // connection attempts.
    // [END cloud_sql_mysql_mysql2_backoff]
  };

  // Check if a Secret Manager secret version is defined
  // If a version is defined, retrieve the secret from Secret Manager and set as the DB_PASS
  const { CLOUD_SQL_CREDENTIALS_SECRET } = process.env;
  if (CLOUD_SQL_CREDENTIALS_SECRET) {
    const secrets = await accessSecretVersion(CLOUD_SQL_CREDENTIALS_SECRET);
    try {
      process.env.DB_PASS = secrets.toString();
    } catch (err) {
      err.message = `Unable to parse secret from Secret Manager. Make sure that the secret is JSON formatted: \n ${err.message} `;
      throw err;
    }
  }

  if (process.env.INSTANCE_CONNECTION_NAME) {
    // Uses the Cloud SQL Node.js Connector when INSTANCE_CONNECTION_NAME
    // (e.g., project:region:instance) is defined
    if (process.env.DB_IAM_USER) {
      //  Either a DB_USER or a DB_IAM_USER should be defined. If both are
      //  defined, DB_IAM_USER takes precedence
      return createConnectorIAMAuthnPool(config);
    } else {
      return createConnectorPool(config);
    }
  } else if (process.env.INSTANCE_HOST) {
    // Use a TCP socket when INSTANCE_HOST (e.g., 127.0.0.1) is defined
    return createTcpPool(config);
  } else if (process.env.INSTANCE_UNIX_SOCKET) {
    // Use a Unix socket when INSTANCE_UNIX_SOCKET (e.g., /cloudsql/proj:region:instance) is defined.
    return createUnixSocketPool(config);
  } else {
    throw "Set either `INSTANCE_CONNECTION_NAME` or `INSTANCE_HOST` or `INSTANCE_UNIX_SOCKET` environment variables.";
  }
};

// Wrap in a try-catch block to handle errors during pool creation
const initPool = async () => {
  try {
    logger.info("Acquired a database connection from the pool.");
    return await createPool();
  } catch (err) {
    console.error("Error creating database pool:", err);
    logger.error("Error creating database pool:", err);
    process.exit(1); // Exit the process if pool creation fails
  }
};

const pool = initPool();

module.exports = pool;
