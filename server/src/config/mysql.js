const mysql = require("mysql2/promise");
const { initMySQLSchema } = require("../services/mysql-schema.service");

let pool;

const initMySQLPool = async () => {
  const shouldInitSchema = `${process.env.MYSQL_AUTO_INIT_SCHEMA || "true"}`.toLowerCase() !== "false";

  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
    queueLimit: 0
  });

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
