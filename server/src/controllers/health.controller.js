const mongoose = require("mongoose");

const { getMySQLPool } = require("../config/mysql");

const getHealth = async (req, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;
  let mysqlConnected = false;
  let mysqlMessage = null;

  try {
    const mysqlPool = getMySQLPool();
    await mysqlPool.query("SELECT 1");
    mysqlConnected = true;
  } catch (error) {
    mysqlMessage = error.message;
  }

  const status = mongoConnected && mysqlConnected ? "ok" : mongoConnected ? "degraded" : "error";
  const responseCode = mongoConnected ? 200 : 503;

  return res.status(responseCode).json({
    status,
    services: {
      mongodb: mongoConnected ? "connected" : "disconnected",
      mysql: mysqlConnected ? "connected" : "disconnected"
    },
    details: {
      demoMode: Boolean(global.DEMO_MODE),
      mysqlUnavailable: Boolean(global.MYSQL_UNAVAILABLE),
      mysqlMessage
    }
  });
};

module.exports = {
  getHealth
};
