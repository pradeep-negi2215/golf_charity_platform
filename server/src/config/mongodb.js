const mongoose = require("mongoose");
const dns = require("dns");

mongoose.set("bufferCommands", false);

const toBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return `${value}`.toLowerCase() === "true";
};

const toNumber = (value, defaultValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

const parseList = (value) => {
  if (!value) {
    return [];
  }

  return `${value}`
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const connectMongoDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI (or MONGO_URI) is missing in environment variables");
  }

  const dnsServers = parseList(process.env.MONGODB_DNS_SERVERS);
  if (dnsServers.length) {
    dns.setServers(dnsServers);
  }

  const mongooseOptions = {
    // Atlas can need more than 5s for DNS + TLS negotiation on cold starts.
    connectTimeoutMS: toNumber(process.env.MONGODB_CONNECT_TIMEOUT_MS, 10000),
    serverSelectionTimeoutMS: toNumber(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS, 15000),
    socketTimeoutMS: toNumber(process.env.MONGODB_SOCKET_TIMEOUT_MS, 45000),
    maxPoolSize: toNumber(process.env.MONGODB_MAX_POOL_SIZE, 10),
    minPoolSize: toNumber(process.env.MONGODB_MIN_POOL_SIZE, 0),
    retryWrites: toBoolean(process.env.MONGODB_RETRY_WRITES, true)
  };

  if (process.env.MONGODB_DB_NAME) {
    mongooseOptions.dbName = process.env.MONGODB_DB_NAME;
  }

  try {
    await mongoose.connect(mongoUri, mongooseOptions);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
};

module.exports = {
  connectMongoDB
};
