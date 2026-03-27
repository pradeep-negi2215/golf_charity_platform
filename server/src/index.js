require("dotenv").config();

const { connectMongoDB } = require("./config/mongodb");
const { initMySQLPool } = require("./config/mysql");
const { validateEnvironment } = require("./config/env");
const app = require("./app");
const port = process.env.PORT || 5000;

const startServer = async () => {
  try {
    validateEnvironment();
    global.DEMO_MODE = false;
    global.MYSQL_UNAVAILABLE = false;

    console.log("Attempting to connect to MongoDB...");
    try {
      await connectMongoDB();
    } catch (mongoError) {
      console.warn("⚠️  MongoDB connection failed:", mongoError.message);
      console.warn("Running in DEMO mode - databases unavailable");
      global.DEMO_MODE = true;
    }

    console.log("Attempting to connect to MySQL...");
    try {
      await initMySQLPool();
    } catch (mysqlError) {
      console.warn("⚠️  MySQL connection failed:", mysqlError.message);
      global.MYSQL_UNAVAILABLE = true;
    }

    app.listen(port, () => {
      let mode = "[PRODUCTION]";

      if (global.DEMO_MODE) {
        mode = "[DEMO MODE]";
      } else if (global.MYSQL_UNAVAILABLE) {
        mode = "[DEGRADED MODE - MySQL unavailable]";
      }

      console.log(`${mode} Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
