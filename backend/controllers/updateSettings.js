const User = require("../models/User");

exports.updateSettings = async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id); // from middleware
    if (!user) return res.status(404).json({ message: "User not found" });

    // Change password if provided
    if (newPassword) {
      if (!oldPassword)
        return res.status(400).json({ message: "Old password required" });

      const isMatch = await user.matchPassword(oldPassword);
      if (!isMatch)
        return res.status(400).json({ message: "Old password is incorrect" });

      // Simply assign new password; pre-save hook will hash it
      user.password = newPassword;
    }

    // Update email if provided
    if (email) user.email = email;

    await user.save();
    res.json({ message: "Settings updated successfully", email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
