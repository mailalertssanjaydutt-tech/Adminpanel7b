// checkAdmin.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import Admin from "./models/Admin.js";

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const admin = await Admin.findOne({ email: "admin@example.com" });
  console.log(admin);
  mongoose.connection.close();
};

run();
