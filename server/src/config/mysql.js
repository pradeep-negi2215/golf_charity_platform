const mysql = require("mysql2/promise");
const { initMySQLSchema } = require("../services/mysql-schema.service");

let pool;

const toBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return `${value}`.toLowerCase() === "true";
};

const buildMySQLConfig = () => {
  const connectionLimit = Number(process.env.MYSQL_CONNECTION_LIMIT || 10);
  const sslEnabled = toBoolean(process.env.MYSQL_SSL_ENABLED, false);
  const sslRejectUnauthorized = toBoolean(process.env.MYSQL_SSL_REJECT_UNAUTHORIZED, true);

  const baseConfig = {
    waitForConnections: true,
    connectionLimit,
    queueLimit: 0
  };

  if (process.env.MYSQL_URL) {
    const parsed = new URL(process.env.MYSQL_URL);

    return {
      ...baseConfig,
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username || ""),
      password: decodeURIComponent(parsed.password || ""),
      database: decodeURIComponent((parsed.pathname || "").replace(/^\//, "")),
      ...(sslEnabled
        ? {
            ssl: {
              rejectUnauthorized: sslRejectUnauthorized
            }
          }
        : {})
    };
  }

  return {
    ...baseConfig,
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ...(sslEnabled
      ? {
          ssl: {
            rejectUnauthorized: sslRejectUnauthorized
          }
        }
      : {})
  };
};

const initMySQLPool = async () => {
  const shouldInitSchema = `${process.env.MYSQL_AUTO_INIT_SCHEMA || "true"}`.toLowerCase() !== "false";

  pool = mysql.createPool(buildMySQLConfig());

  await pool.query("SELECT 1");

  if (shouldInitSchema) {
    await initMySQLSchema(pool);
  }

  console.log("MySQL connected");
};

const getMySQLPool = () => {
  if (!pool) {
    throw new Error("MySQL pool not initialized. Call initMySQLPool first.");
  }

  return pool;
};

module.exports = {
  initMySQLPool,
  getMySQLPool
};
