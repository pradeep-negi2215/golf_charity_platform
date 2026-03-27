const { connectMongoDB } = require("../src/config/mongodb");
const { initMySQLPool } = require("../src/config/mysql");
const { validateEnvironment } = require("../src/config/env");
const app = require("../src/app");

let initialized = false;
let initPromise;

const initialize = async () => {
  if (initialized) {
    return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      validateEnvironment();
      global.DEMO_MODE = false;
      global.MYSQL_UNAVAILABLE = false;

      try {
        await connectMongoDB();
      } catch (mongoError) {
        console.warn("MongoDB connection failed in serverless runtime:", mongoError.message);
        global.DEMO_MODE = true;
      }

      try {
        await initMySQLPool();
      } catch (mysqlError) {
        console.warn("MySQL connection failed in serverless runtime:", mysqlError.message);
        global.MYSQL_UNAVAILABLE = true;
      }

      initialized = true;
    })();
  }

  await initPromise;
};

module.exports = async (req, res) => {
  await initialize();
  return app(req, res);
};
