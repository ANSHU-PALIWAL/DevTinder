const express = require("express");
const bcrypt = require("bcrypt");
const { userAuth } = require("../middlewares/auth");
const { validateEditProfileData } = require("../utils/validation");

const profileRouter = express.Router();

// Get Profile Api
profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user;
    res.send(user);
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

// Edit Profile Api
profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
    if (!validateEditProfileData) {
      throw new Error("Invalid Edit Request");
    }

    const loggedInUser = req.user;

    Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));

    await loggedInUser.save();

    res.json({
      message: `${loggedInUser.firstName}, Your Profile Has Been Updated Successfuly`,
      data: loggedInUser,
    });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

// Edit Password Api
profileRouter.patch("/profile/edit-password", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { oldPassword, newPassword } = req.body;

    if (!loggedInUser.validatePassword(oldPassword)) {
      throw new Error("Invalid Old Password");
    }

    loggedInUser.password = newPassword;
    await loggedInUser.save();

    res.json({
      message: `${loggedInUser.firstName}, Your Password Has Been Updated Successfuly`,
      data: loggedInUser,
    });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
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
      return res.status(400).send("Incorrect current password.");
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Save to database
    loggedInUser.password = passwordHash;
    await loggedInUser.save();

    res.json({ message: "Password updated successfully!" });
  } catch (err) {
    res.status(500).send("Error updating password: " + err.message);
  }
});

// DELETE ACCOUNT API
profileRouter.delete("/profile/delete", userAuth, async (req, res) => {
  try {
    // 💥 FIX: We use req.user.deleteOne() so we don't need to import the User model!
    await req.user.deleteOne();

    // Clear the auth cookie so they are logged out
    res.cookie("token", null, { expires: new Date(Date.now()) });

    res.json({ message: "Account deleted successfully." });
  } catch (err) {
    res.status(500).send("Error deleting account: " + err.message);
  }
});

module.exports = profileRouter;
