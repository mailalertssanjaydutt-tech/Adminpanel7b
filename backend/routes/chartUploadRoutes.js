const express = require("express");
const multer = require("multer");
const { uploadExcelChart } = require("../controllers/chartUploadController");

const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post(
  "/upload/:gameId/:year",
  upload.single("excelFile"),
  uploadExcelChart
);

module.exports = router;
