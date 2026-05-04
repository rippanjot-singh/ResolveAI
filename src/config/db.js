const mongoose = require('mongoose');
const config = require('./config');
const { Pinecone } = require('@pinecone-database/pinecone');

const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

let indexInstance = null;

const vectorDB = async () => {
  try {
    if (!indexInstance) {
      const pc = new Pinecone({
        apiKey: config.PINECONE_API_KEY
      });
      indexInstance = pc.Index("resolveai");
      console.log("Pinecone Index initialized");
    }
    return indexInstance;
  } catch (error) {
    console.error("vector db connection failed:", error.message);
    throw error;
  }
};

module.exports = { connectDB, vectorDB };