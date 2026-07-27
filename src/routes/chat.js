const express = require("express");
const { userAuth } = require("../middlewares/auth");
const Message = require("../models/message");
const User = require("../models/user");
const ConnectionRequest = require("../models/connectionRequest");

const chatRouter = express.Router();

// Get Chat History with a specific user
chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.user._id;

    // Verify connection
    const connection = await ConnectionRequest.findOne({
      $or: [
        { fromUserId: userId, toUserId: targetUserId, status: "accepted" },
        { fromUserId: targetUserId, toUserId: userId, status: "accepted" },
      ],
    });

    if (!connection) {
      return res.status(403).json({ message: "You are not connected with this user." });
    }

    // Fetch messages where either one is sender and the other is receiver
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: userId },
      ],
    }).sort({ createdAt: 1 }); // Oldest to newest

    res.json({ data: messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update current user's public key
chatRouter.post("/chat/key", userAuth, async (req, res) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey) {
      return res.status(400).json({ message: "Public key is required." });
    }

    const user = req.user;
    user.publicKey = publicKey;
    await user.save();

    res.json({ message: "Public key updated successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Fetch target user's public key
chatRouter.get("/chat/key/:targetUserId", userAuth, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.user._id;

    // Need to verify connection? Yes, for privacy
    const connection = await ConnectionRequest.findOne({
      $or: [
        { fromUserId: userId, toUserId: targetUserId, status: "accepted" },
        { fromUserId: targetUserId, toUserId: userId, status: "accepted" },
      ],
    });

    if (!connection) {
      return res.status(403).json({ message: "You are not connected with this user." });
    }

    const targetUser = await User.findById(targetUserId).select("publicKey");
    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ data: targetUser.publicKey });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = chatRouter;
