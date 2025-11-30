const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");
dotenv.config();
const connectDB = require("./config/db");

const createAdmin = async () => {
  try {
    await connectDB();

    const adminExists = await User.findOne({ email: "admin@example.com" });
    if (adminExists) {
      console.log("Admin user already exists!");
      process.exit();
    }

    const admin = await User.create({
      email: "admin@example.com",
      password: "admin123", // You can change this password
    });

    console.log("Admin user created successfully!");
    console.log(`Email: ${admin.email}`);
    console.log(`Password: admin123`);
    process.exit();
  } catch (err) {
    console.error("Error creating admin:", err);
    process.exit(1);
  }
};

createAdmin();
