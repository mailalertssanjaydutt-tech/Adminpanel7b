const express = require("express");
const { saveContact, getMessages, replyMessage,  deleteMessage,
  deleteAllMessages } = require("../controllers/contactController.js");

const router = express.Router();

// Public route: save contact form
router.post("/", saveContact);

// Admin routes
router.get("/", getMessages);
router.post("/reply", replyMessage);

router.delete('/:id', deleteMessage);      // Delete single message by ID
router.delete('/', deleteAllMessages);

module.exports = router;
