// dropAppointments.js
const mongoose = require("mongoose");

// Must match .env.local’s MONGO_URI
const MONGO_URI = "mongodb://localhost:27017/freshface";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const collections = await mongoose.connection.db.listCollections().toArray();
    const hasAppointments = collections.some(col => col.name === "appointments");

    if (!hasAppointments) {
      console.log("ℹ️  No appointments collection found. Nothing to drop.");
    } else {
      await mongoose.connection.db.dropCollection("appointments");
      console.log("🗑 Dropped the 'appointments' collection");
    }
  } catch (err) {
    console.error("❌ Error dropping collection:", err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

run();
