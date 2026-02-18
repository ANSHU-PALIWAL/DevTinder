const express = require("express");
const connectDB = require("./config/database");
const app = express();
const User = require("./models/user");
const { validateSignUpData } = require("./utils/validation");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { userAuth } = require("./middlewares/auth");

app.use(express.json());
app.use(cookieParser());

// User SignUp Api
app.post("/signup", async (req, res) => {
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
app.post("/login", async (req, res) => {
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

// Get Profile Api
app.get("/profile", userAuth, async (req, res) => {
  try {
    const user = req.user;
    res.send(user);
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

// Sending Connection Request Api
app.post("/sendConnectionRequest", userAuth, async (req, res) => {
  const user = req.user;
  // Sending Connection Request
  // console.log("Sending A Connection Request");
  res.send(user.firstName + " Sent The Connection Request");
});

// DataBase Connection and Server Start
connectDB()
  .then(() => {
    // console.log("Database Coonection Established...");
    app.listen(7777, () => {
      // console.log("Server is successfully listning on port 7777");
    });
  })
  .catch((err) => {
    console.error("Error connecting to the database");
  });
