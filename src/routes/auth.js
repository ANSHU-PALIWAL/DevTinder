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

    // Extracting Field's
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

    await user.save();
    res.send("User Created Successfully 🎉");
  } catch (err) {
    res.status(400).send("Error Creating The User: " + err.message);
  }
});

// User Login Api
authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;

    if (!emailId || !password) {
      throw new Error("Email and Password are required");
    }

    const user = await User.findOne({ emailId: emailId });

    if (!user) {
      throw new Error("Invalid Email");
    }

    const isPasswordValid = await user.validatePassword(password);

    if (isPasswordValid) {
      const token = await user.getJWT();

      res.cookie("token", token, {
        expires: new Date(Date.now() + 8 * 3600000),
      });

      res.send("Login Successful 🎉");
    } else {
      throw new Error("Invalid Password");
    }
  } catch (err) {
    res.status(400).send("Error Logging In The User: " + err.message);
  }
});

// User Logout Api
authRouter.post("/logout", (req, res) => {
  res.cookie("token", null, { expires: new Date(Date.now()) });
  res.send("Logout Successful 🎉");
});

module.exports = authRouter;
