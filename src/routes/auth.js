const bcrypt = require("bcrypt");
const express = require("express");
const User = require("../models/user");
const { validateSignUpData } = require("../utils/validation");
const { OAuth2Client } = require("google-auth-library");
const sendEmail = require("../utils/sendEmail");

const authRouter = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

authRouter.post("/signup", async (req, res) => {
  try {
    validateSignUpData(req);

    const { firstName, lastName, emailId, password } = req.body;

    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ error: "First and Last name are required for manual signup." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });

    let savedUser = await user.save();

    // 🚀 SEND WELCOME EMAIL (Manual Signup)
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
          <h1 style="color: #00B171;">Welcome to ConnectNeighbour! 🎉</h1>
          <p style="font-size: 16px; color: #333;">Hi ${firstName},</p>
          <p style="font-size: 16px; color: #333;">We are thrilled to have you in the neighborhood. Start discovering locals, sharing skills, and building your community today.</p>
          <br>
          <p style="font-size: 14px; color: #777;">- The ConnectNeighbour Team</p>
        </div>
      `;
      await sendEmail.run(
        emailId,
        "Welcome to ConnectNeighbour! 🎉",
        emailHtml,
      );
    } catch (emailErr) {
      console.error("Welcome email failed to send:", emailErr);
    }

    const token = await savedUser.getJWT();
    const userObject = savedUser.toObject();
    delete userObject.password;

    res.cookie("token", token, {
      expires: new Date(Date.now() + 8 * 3600000),
    });

    return res.json({
      success: true,
      message: "User Created Successfully 🎉",
      data: userObject,
    });
  } catch (err) {
    let errorMessage = err.message;
    if (err.code === 11000) {
      errorMessage = "A user with this email address already exists.";
    } else if (err.name === "ValidationError") {
      errorMessage = Object.values(err.errors)[0].message;
    }
    return res.status(400).json({ success: false, message: errorMessage });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;

    if (!emailId || !password) {
      throw new Error("Email and Password are required.");
    }

    const user = await User.findOne({ emailId: emailId });

    if (!user) {
      throw new Error("Invalid credentials.");
    }

    if (!user.password) {
      throw new Error(
        "You created your account via Google. Please log in using the Google button above.",
      );
    }

    const isPasswordValid = await user.validatePassword(password);

    if (isPasswordValid) {
      const token = await user.getJWT();

      res.cookie("token", token, {
        expires: new Date(Date.now() + 8 * 3600000),
      });

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

authRouter.post("/auth/google", async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    let user = await User.findOne({ emailId: payload.email });

    if (!user) {
      user = new User({
        firstName: payload.given_name,
        lastName: payload.family_name,
        emailId: payload.email,
        photoUrl:
          payload.picture ||
          "https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg",
      });
      await user.save();

      // 🚀 SEND WELCOME EMAIL (Google Auth - New User Only)
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <h1 style="color: #00B171;">Welcome to ConnectNeighbour! 🎉</h1>
            <p style="font-size: 16px; color: #333;">Hi ${payload.given_name},</p>
            <p style="font-size: 16px; color: #333;">We are thrilled to have you in the neighborhood. Start discovering locals, sharing skills, and building your community today.</p>
            <br>
            <p style="font-size: 14px; color: #777;">- The ConnectNeighbour Team</p>
          </div>
        `;
        await sendEmail.run(
          payload.email,
          "Welcome to ConnectNeighbour! 🎉",
          emailHtml,
        );
      } catch (emailErr) {
        console.error("Welcome email failed to send:", emailErr);
      }
    } else {
      if (
        payload.picture &&
        (!user.photoUrl || user.photoUrl.includes("freepik.com"))
      ) {
        user.photoUrl = payload.picture;
        await user.save();
      }
    }

    const jwtToken = await user.getJWT();

    res.cookie("token", jwtToken, {
      expires: new Date(Date.now() + 8 * 3600000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    const userObject = user.toObject();
    delete userObject.password;

    return res.json({
      success: true,
      message: "Google Login Successful",
      data: userObject,
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    return res.status(400).json({
      success: false,
      message: "Google authentication failed. Please try again.",
    });
  }
});

authRouter.post("/logout", (req, res) => {
  res.cookie("token", null, { expires: new Date(Date.now()) });
  return res.json({
    success: true,
    message: "Logout Successful 🎉",
  });
});

module.exports = authRouter;
