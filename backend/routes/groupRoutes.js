const express = require("express");
const router = express.Router();
const groupController = require("../controllers/groupController");

// Get all groups
router.get("/all", groupController.getAllGroups);

// routes/groupRoutes.js
router.get("/name/:name", groupController.getGroupByName); // full group data
router.get("/name/:name/monthly", groupController.getMonthlyGroupDataUpToYesterday); // monthly filtered




// Create a group
router.post("/create", groupController.createGroup);

// Update a group
router.put("/:id", groupController.updateGroup);

// Delete a group
router.delete("/:id", groupController.deleteGroup);

module.exports = router;
