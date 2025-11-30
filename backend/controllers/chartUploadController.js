// controllers/uploadController.js (replace the handler)
const XLSX = require("xlsx");
const fs = require("fs");
const Chart = require("../models/Chart");

function createEmptyNumbers() {
  return Array.from({ length: 31 }, () => ({ value: "", declaredAt: null }));
}

exports.uploadExcelChart = async (req, res) => {
  try {
    const { gameId, year } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const numericYear = Number(year);
    if (!numericYear || isNaN(numericYear)) {
      // clean up file
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Invalid year parameter" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (!Array.isArray(rows) || rows.length === 0) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Excel file empty or invalid" });
    }

    // Normalize headers (first row)
    const rawHeaders = rows[0].map(h => (h === undefined || h === null) ? "" : String(h).trim().toLowerCase());

    const monthKeys = {
      jan: 1, feb: 2, mar: 3, apr: 4,
      may: 5, jun: 6, jul: 7, aug: 8,
      sep: 9, oct: 10, nov: 11, dec: 12
    };

    const results = [];

    // Loop all months present in monthKeys
    for (const mkey of Object.keys(monthKeys)) {
      const month = monthKeys[mkey];

      // find a header column that starts with the month short name
      const colIndex = rawHeaders.findIndex(h => h.startsWith(mkey));
      if (colIndex === -1) {
        results.push({ month, status: "missing", message: `Column ${mkey.toUpperCase()} not found` });
        continue;
      }

      const daysInMonth = new Date(numericYear, month, 0).getDate();

      // read rows 1..daysInMonth (rows[1] => day 1)
      const numbersFromSheet = [];
      for (let r = 1; r <= daysInMonth; r++) {
        const row = rows[r] || [];
        const cell = row[colIndex];
        if (cell === undefined || cell === null || cell === "") {
          numbersFromSheet.push("");
        } else {
          // normalize numeric-looking values to string without decimals if possible
          if (typeof cell === "number") {
            numbersFromSheet.push(String(Math.floor(cell)));
          } else {
            numbersFromSheet.push(String(cell).trim());
          }
        }
      }

      // find existing chart or create a new one
      let chart = await Chart.findOne({ game: gameId, year: numericYear, month: month });

      if (!chart) {
        chart = new Chart({
          game: gameId,
          year: numericYear,
          month,
          numbers: createEmptyNumbers(),
        });
      } else {
        // ensure numbers[] is array and length 31 of objects
        if (!Array.isArray(chart.numbers)) chart.numbers = createEmptyNumbers();
        while (chart.numbers.length < 31) chart.numbers.push({ value: "", declaredAt: null });
      }

      // Update values — we leave declaredAt as null for imported data.
      numbersFromSheet.forEach((cellVal, idx) => {
        // only write first daysInMonth
        chart.numbers[idx].value = (cellVal === null || cellVal === undefined) ? "" : String(cellVal);
        // do not set declaredAt for imports (keeps it null)
        chart.numbers[idx].declaredAt = chart.numbers[idx].value === "" ? null : chart.numbers[idx].declaredAt || null;
      });

      // Make sure remaining slots (if any) are objects
      while (chart.numbers.length < 31) chart.numbers.push({ value: "", declaredAt: null });

      await chart.save();

      results.push({ month, status: "saved", daysSaved: numbersFromSheet.length });
    }

    // cleanup uploaded file
    try { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (e) { console.warn("Failed to unlink file", e); }

    return res.json({ message: "Excel chart uploaded", results });
  } catch (err) {
    console.error("uploadExcelChart error:", err);
    // cleanup
    try { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (e) {}
    return res.status(500).json({ message: "Upload failed", error: err.message });
  }
};
