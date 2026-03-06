const express = require("express");
const bcrypt = require("bcrypt");
const validator = require("validator");
const { userAuth } = require("../middlewares/auth");
const { validateEditProfileData } = require("../utils/validation");

const profileRouter = express.Router();

// Get Profile Api
profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user;
    // We leave this as a direct object (not wrapped in 'data') so we don't break Body.jsx!
    res.json(user);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Edit Profile Api
profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
    // 🐛 FIX: Added (req) to actually execute the function!
    if (!validateEditProfileData(req)) {
      throw new Error("Invalid Edit Request");
    }

    const loggedInUser = req.user;

    Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));

    await loggedInUser.save();

    res.json({
      success: true,
      message: `${loggedInUser.firstName}, Your Profile Has Been Updated Successfully`,
      data: loggedInUser,
    });
  } catch (err) {
    let errorMessage = err.message;

    // 🛡️ FIX: Clean up Mongoose Validation Errors for the UI
    if (err.name === "ValidationError") {
      errorMessage = Object.values(err.errors)[0].message;
    }

    res.status(400).json({ success: false, message: errorMessage });
  }
});

// UPDATE PASSWORD API
profileRouter.patch("/profile/password", userAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const loggedInUser = req.user;

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      loggedInUser.password,
    );
    if (!isPasswordValid) {
      throw new Error("Incorrect current password.");
    }

    // 🛡️ THE FIX: Strictly check the new password BEFORE hashing it!
    if (!newPassword || !validator.isStrongPassword(newPassword)) {
      throw new Error(
        "Please enter a stronger new password (use uppercase, numbers, and symbols).",
      );
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Save to database
    loggedInUser.password = passwordHash;
    await loggedInUser.save();

    res.json({ success: true, message: "Password updated successfully!" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE ACCOUNT API
profileRouter.delete("/profile/delete", userAuth, async (req, res) => {
  try {
    await req.user.deleteOne();

    // Clear the auth cookie so they are logged out
    res.cookie("token", null, { expires: new Date(Date.now()) });

    res.json({ success: true, message: "Account deleted successfully." });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting account." });
  }
});

module.exports = profileRouter;
