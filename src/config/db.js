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

const vectorDB = async () => {
  try {

    const pc = new Pinecone({
      apiKey: config.PINECONE_API_KEY
    });

    const index = pc.Index("resolveai");
    return index;

  } catch (error) {
    console.error("vector db connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = { connectDB, vectorDB };