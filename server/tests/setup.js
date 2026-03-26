const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

const setupTestDatabase = async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
};

const clearTestDatabase = async () => {
  const collections = mongoose.connection.collections;
  const collectionNames = Object.keys(collections);

  for (const name of collectionNames) {
    await collections[name].deleteMany({});
  }
};

const teardownTestDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();

  if (mongoServer) {
    await mongoServer.stop();
  }
};

module.exports = {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase
};
