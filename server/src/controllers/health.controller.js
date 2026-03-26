const mongoose = require("mongoose");

const { getMySQLPool } = require("../config/mysql");

const getHealth = async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

    const mysqlPool = getMySQLPool();
    await mysqlPool.query("SELECT 1");

    res.status(200).json({
      status: "ok",
      services: {
        mongodb: mongoStatus,
        mysql: "connected"
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

module.exports = {
  getHealth
};
