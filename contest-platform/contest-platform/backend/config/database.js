/**
 * database.js
 * ───────────
 * Establishes a Mongoose connection to MongoDB.
 * Optimized for high concurrent load (200+ users).
 * Includes connection pooling, retry logic, and monitoring.
 */

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/debugcontest';

async function connectDB() {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,

      // Connection pooling for high concurrency
      maxPoolSize: 100,        // Max 100 concurrent connections
      minPoolSize: 10,         // Keep at least 10 connections ready

      // Timeout settings
      serverSelectionTimeoutMS: 5000,  // Timeout after 5s if no server found
      socketTimeoutMS: 45000,          // Close sockets after 45s of inactivity

      // Retry settings
      retryWrites: true,
      retryReads: true
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    console.log(`   Connection pool: min=${conn.connection.client.s.options.minPoolSize}, max=${conn.connection.client.s.options.maxPoolSize}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);

    // Retry connection after 5 seconds
    console.log('⏳ Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
}

// Log disconnection warnings
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting reconnection...');
});

// Log reconnection success
mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully');
});

// Log connection errors
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

module.exports = { connectDB };
