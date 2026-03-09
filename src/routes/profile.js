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
    res.json(user);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Edit Profile Api
profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
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

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      loggedInUser.password,
    );
    if (!isPasswordValid) {
      throw new Error("Incorrect current password.");
    }

    if (!newPassword || !validator.isStrongPassword(newPassword)) {
      throw new Error(
        "Please enter a stronger new password (use uppercase, numbers, and symbols).",
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    loggedInUser.password = passwordHash;
    await loggedInUser.save();

    res.json({ success: true, message: "Password updated successfully!" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 🌍 SILENT LOCATION UPDATE API
profileRouter.patch("/profile/location", userAuth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const loggedInUser = req.user;

    if (lat === undefined || lng === undefined) {
      throw new Error("Latitude and longitude are required.");
    }

    // Format for MongoDB GeoJSON (Longitude always comes first!)
    loggedInUser.location = {
      type: "Point",
      coordinates: [lng, lat],
    };

    await loggedInUser.save();

    res.json({ success: true, message: "Location updated successfully." });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE ACCOUNT API
profileRouter.delete("/profile/delete", userAuth, async (req, res) => {
  try {
    await req.user.deleteOne();
    res.cookie("token", null, { expires: new Date(Date.now()) });
    res.json({ success: true, message: "Account deleted successfully." });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting account." });
  }
});

module.exports = profileRouter;
