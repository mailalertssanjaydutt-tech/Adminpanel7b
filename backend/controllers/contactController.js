const Contact = require("../models/Contact.js");
const nodemailer = require("nodemailer");

// Save a new contact submission
const saveContact = async (req, res) => {
  try {
    const { fullName, email, phone, message } = req.body;

    if (!fullName || !email || !phone) {
      return res.status(400).json({ success: false, error: "All fields are required." });
    }

    const newContact = new Contact({ fullName, email, phone, message });
    await newContact.save();

    res.json({ success: true, message: "Contact submitted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Fetch all contact messages for admin
const getMessages = async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Reply to a contact message via email
const replyMessage = async (req, res) => {
  const { email, subject, reply } = req.body;

  if (!email || !subject || !reply) {
    return res.status(400).json({ success: false, error: "Missing fields" });
  }

  try {
    // 1️⃣ Send email
    const transporter = nodemailer.createTransport({
      service: "Gmail", // Or your SMTP provider
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html: `<p>${reply}</p>`,
    });

    // 2️⃣ Save reply in database
    const contact = await Contact.findOne({ email });
    if (!contact) {
      return res.status(404).json({ success: false, error: "Message not found" });
    }

    contact.replies.push({
      text: reply,
      sender: "admin",
      createdAt: new Date(),
    });

    await contact.save();

    res.json({ success: true, message: "Reply sent and saved successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete a single contact message by ID
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: "Message ID is required" });
    }

    const deletedMessage = await Contact.findByIdAndDelete(id);

    if (!deletedMessage) {
      return res.status(404).json({ success: false, error: "Message not found" });
    }

    res.json({ 
      success: true, 
      message: "Message deleted successfully",
      deletedMessage 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete all contact messages
const deleteAllMessages = async (req, res) => {
  try {
    const result = await Contact.deleteMany({});

    res.json({ 
      success: true, 
      message: `All ${result.deletedCount} messages deleted successfully`,
      deletedCount: result.deletedCount 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { 
  saveContact, 
  getMessages, 
  replyMessage, 
  deleteMessage, 
  deleteAllMessages 
};