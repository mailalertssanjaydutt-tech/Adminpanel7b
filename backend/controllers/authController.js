const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// Login controller
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user._id);
    res.json({ token, email: user.email });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get current user controller
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.json(user);
};
