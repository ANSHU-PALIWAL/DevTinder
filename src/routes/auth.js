const bcrypt = require("bcrypt");
const express = require("express");
const User = require("../models/user");
const { validateSignUpData } = require("../utils/validation");

const authRouter = express.Router();

// User SignUp Api
authRouter.post("/signup", async (req, res) => {
  try {
    // Validation Of Data
    validateSignUpData(req);

    // Extracting Fields
    const { firstName, lastName, emailId, password } = req.body;

    // Encrypt The password
    const passwordHash = await bcrypt.hash(password, 10);

    // Creating a new instance of the User model
    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });

    let savedUser = await user.save();
    const token = await savedUser.getJWT();

    // Remove password from the response object for security
    const userObject = savedUser.toObject();
    delete userObject.password;

    res.cookie("token", token, {
      expires: new Date(Date.now() + 8 * 3600000), // 8 hours
    });

    // 🚀 FIX: Return a single, clean JSON response
    return res.json({
      success: true,
      message: "User Created Successfully 🎉",
      data: userObject,
    });
  } catch (err) {
    let errorMessage = err.message;

    // 🛡️ FIX: Handle Duplicate Email Error (MongoDB Code 11000)
    if (err.code === 11000) {
      errorMessage = "A user with this email address already exists.";
    }
    // 🛡️ FIX: Clean up Mongoose Validation Errors
    else if (err.name === "ValidationError") {
      // Extract just the first validation error message to keep the UI clean
      errorMessage = Object.values(err.errors)[0].message;
    }

    return res.status(400).json({
      success: false,
      message: errorMessage,
    });
  }
});

// User Login Api
authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;

    if (!emailId || !password) {
      throw new Error("Email and Password are required.");
    }

    const user = await User.findOne({ emailId: emailId });

    if (!user) {
      // 🔒 SECURITY FIX: Never specify if it was the email or password that was wrong
      throw new Error("Invalid credentials.");
    }

    const isPasswordValid = await user.validatePassword(password);

    if (isPasswordValid) {
      const token = await user.getJWT();

      res.cookie("token", token, {
        expires: new Date(Date.now() + 8 * 3600000),
      });

      // Remove password before sending to frontend
      const userObject = user.toObject();
      delete userObject.password;

      return res.json({
        success: true,
        message: "Login Successful",
        data: userObject,
      });
    } else {
      throw new Error("Invalid credentials.");
    }
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

// User Logout Api
authRouter.post("/logout", (req, res) => {
  res.cookie("token", null, { expires: new Date(Date.now()) });
  return res.json({
    success: true,
    message: "Logout Successful 🎉",
  });
});

module.exports = authRouter;
