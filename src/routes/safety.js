const express = require("express");
const Block = require("../models/block");
const Report = require("../models/report");
const User = require("../models/user");
const ConnectionRequest = require("../models/connectionRequest");
const { userAuth } = require("../middlewares/auth");

const safetyRouter = express.Router();

// Block a user
safetyRouter.post("/block/:userId", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { userId: blockedId } = req.params;

    if (loggedInUser._id.toString() === blockedId) {
      return res.status(400).json({ success: false, message: "You cannot block yourself." });
    }

    const targetUser = await User.findById(blockedId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Check if already blocked
    const existingBlock = await Block.findOne({
      blockerId: loggedInUser._id,
      blockedId: blockedId,
    });

    if (existingBlock) {
      return res.status(400).json({ success: false, message: "User is already blocked." });
    }

    // Create block record
    const block = new Block({
      blockerId: loggedInUser._id,
      blockedId: blockedId,
    });
    await block.save();

    // Optionally: Automatically reject any connection requests between them
    await ConnectionRequest.updateMany(
      {
        $or: [
          { fromUserId: loggedInUser._id, toUserId: blockedId },
          { fromUserId: blockedId, toUserId: loggedInUser._id }
        ]
      },
      { status: "ignored" }
    );

    res.json({ success: true, message: "User blocked successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Report a user
safetyRouter.post("/report/:userId", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { userId: reportedId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ success: false, message: "Reason is required." });
    }

    if (loggedInUser._id.toString() === reportedId) {
      return res.status(400).json({ success: false, message: "You cannot report yourself." });
    }

    const targetUser = await User.findById(reportedId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const report = new Report({
      reporterId: loggedInUser._id,
      reportedId: reportedId,
      reason: reason.trim(),
    });

    await report.save();

    res.json({ success: true, message: "Report submitted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = safetyRouter;
