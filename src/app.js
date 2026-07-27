const express = require("express");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/database");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// 🚀 FIX: Increased the limit to 50mb to allow large Base64 image strings!
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(cookieParser());

const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");
const contactRouter = require("./routes/contact");
const chatRouter = require("./routes/chat");
const safetyRouter = require("./routes/safety");
const eventRouter = require("./routes/event");
const groupRouter = require("./routes/group");

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);
app.use("/", contactRouter);
app.use("/", chatRouter);
app.use("/", safetyRouter);
app.use("/", eventRouter);
app.use("/", groupRouter);


const { createServer } = require("http");
const { initializeSocket } = require("./utils/socket");

// Wrap app with http server
const server = createServer(app);
initializeSocket(server);

// DataBase Connection and Server Start
connectDB()
  .then(() => {
    server.listen(process.env.PORT, () => {
      console.log(
        "Server is successfully listening on port " + process.env.PORT,
      );
    });
  })
  .catch((err) => {
    console.error("Error connecting to the database: " + err.message);
  });

