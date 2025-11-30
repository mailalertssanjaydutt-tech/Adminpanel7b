const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const gameRoutes = require('./routes/gameRoutes');
const chartRoutes = require("./routes/chartRoutes");
const resultsRoutes = require("./routes/resultsRoutes");
const updateSettings = require("./routes/updateSettings");
const todayResultRoutes = require("./routes/todayResultRoutes");
const groupRoutes = require("./routes/groupRoutes");
const adRoutes = require("./routes/adRoutes")
const contactRoute = require("./routes/contactRoute.js");
const chartUploadRoutes = require("./routes/chartUploadRoutes");





dotenv.config();
connectDB();

const app = express();

const allowedOrigins = [
  "https://admin.a7satta.vip",
  "https://a7satta.vip",
  "https://www.a7satta.vip",
  "http://localhost:5173"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);



app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Mount auth routes
app.use("/api/auth", authRoutes);

app.use('/api/games', gameRoutes);

app.use("/api", chartRoutes);

app.use("/api/results", resultsRoutes);

app.use("/api", updateSettings);

app.use("/api", todayResultRoutes);

app.use("/api/group", groupRoutes);

app.use("/api/ads", adRoutes);

app.use("/api/contact", contactRoute);

app.use("/api/chart", chartUploadRoutes);





const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
