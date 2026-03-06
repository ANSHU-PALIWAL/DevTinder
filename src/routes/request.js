const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");

const requestRouter = express.Router();

// Sending Connection Request Api
requestRouter.post(
  "/request/send/:status/:toUserId",
  userAuth,
  async (req, res) => {
    try {
      const fromUserId = req.user._id;
      const toUserId = req.params.toUserId;
      const status = req.params.status;

      // 🛡️ SECURITY FIX: Validate MongoDB ObjectId to prevent server crashes
      if (!mongoose.Types.ObjectId.isValid(toUserId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid User ID format." });
      }

      // 🛡️ LOGIC FIX: Prevent a user from sending a request to themselves
      if (fromUserId.toString() === toUserId.toString()) {
        return res
          .status(400)
          .json({
            success: false,
            message: "You cannot send a request to yourself!",
          });
      }

      const allowedStatus = ["ignored", "interested"];
      if (!allowedStatus.includes(status)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid Status Type: " + status });
      }

      const toUser = await User.findById(toUserId);
      if (!toUser) {
        return res
          .status(404)
          .json({ success: false, message: "User Not Found." });
      }

      // Check For the existing ConnectionRequest
      const existingConnectionRequest = await ConnectionRequest.findOne({
        $or: [
          { fromUserId, toUserId },
          { fromUserId: toUserId, toUserId: fromUserId },
        ],
      });

      if (existingConnectionRequest) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Connection Request Already Exists!",
          });
      }

      const connectionRequest = new ConnectionRequest({
        fromUserId,
        toUserId,
        status,
      });

      const data = await connectionRequest.save();

      res.json({
        success: true,
        message: "Connection Request: " + status,
        data,
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },
);

requestRouter.post(
  "/request/review/:status/:requestId",
  userAuth,
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const { status, requestId } = req.params;

      // 🛡️ SECURITY FIX: Validate Request ID to prevent crashes
      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid Request ID format." });
      }

      const allowedStatus = ["accepted", "rejected"];
      if (!allowedStatus.includes(status)) {
        return res
          .status(400)
          .json({ success: false, message: "Status not Allowed." });
      }

      const connectionRequest = await ConnectionRequest.findOne({
        _id: requestId,
        toUserId: loggedInUser._id,
        status: "interested",
      });

      if (!connectionRequest) {
        return res
          .status(404)
          .json({ success: false, message: "Connection Request Not Found." });
      }

      connectionRequest.status = status;
      const data = await connectionRequest.save();

      res.json({
        success: true,
        message: "Connection Request: " + status,
        data,
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },
);

module.exports = requestRouter;
