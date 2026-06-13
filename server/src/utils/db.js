const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
};

module.exports = connectDB;
