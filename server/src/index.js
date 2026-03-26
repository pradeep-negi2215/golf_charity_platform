require("dotenv").config();

const { connectMongoDB } = require("./config/mongodb");
const { initMySQLPool } = require("./config/mysql");
const { validateEnvironment } = require("./config/env");
const app = require("./app");
const port = process.env.PORT || 5000;

const startServer = async () => {
  try {
    validateEnvironment();
    await connectMongoDB();
    await initMySQLPool();

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
