const express = require("express");
const { userAuth } = require("../middlewares/auth");

const requestRouter = express.Router();

// Sending Connection Request Api
requestRouter.post("/sendConnectionRequest", userAuth, async (req, res) => {
  const user = req.user;
  res.send(user.firstName + " Sent The Connection Request");
});

module.exports = requestRouter;
