const express = require("express");

const app = express();

// this will only handle get calls to /user with parameters userId, name, and password changes
app.get(
  "/user",
  (req, res, next) => {
    console.log("handling the route user!!");
    next();
  },

  (req, res) => {
    console.log("handling the route user");
    res.send("User route accessed");
  },
);

app.listen(7777, () => {
  console.log("Server is running on port 7777");
});
