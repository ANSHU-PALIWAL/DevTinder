const express = require("express");

const app = express();

app.use("/", (err, req, res, next) => {
  if (err) {
    res.status(500).send("Something went wrong!");
  }
});

app.get("/getUserData", (req, res) => {
  try {
    throw new Error("sdjhvfgd");
    res.send("User data Sent");
  } catch (err) {
    res.status(500).send("Some Error Contact Support team");
  }
});

app.listen(7777, () => {
  console.log("Server is running on port 7777");
});
