const mongoose = require("mongoose");
const Chart = require("./models/Chart"); // Adjust path if needed

async function migrateCharts() {
  try {
    await mongoose.connect(
      "mongodb+srv://magicalboomatrix:magicalboomatrix12345@cluster0.di0naoq.mongodb.net/a7?appName=Cluster0",
      { useNewUrlParser: true, useUnifiedTopology: true }
    );

    const charts = await Chart.find({});

    for (const chart of charts) {
      const now = new Date();

      chart.numbers = chart.numbers.map((n, idx) => {
        // If n is already an object with value, leave it as is
        if (n && typeof n === "object" && "value" in n) {
          return n;
        }

        // If n is a string or other type, convert to object
        if (typeof n === "string" && n !== "") {
          const declaredDate = new Date(
            chart.year,
            chart.month - 1,
            idx + 1,
            now.getHours(),
            now.getMinutes(),
            now.getSeconds()
          );
          return { value: n, declaredAt: declaredDate };
        } else {
          return { value: "", declaredAt: null };
        }
      });

      await chart.save();
      console.log(`Migrated chart for game ${chart.game}, ${chart.month}/${chart.year}`);
    }

    console.log("Migration complete!");
    mongoose.disconnect();
  } catch (err) {
    console.error("Migration failed:", err);
    mongoose.disconnect();
  }
}

migrateCharts();
