const express = require("express");
const Group = require("../models/group");
const GroupMessage = require("../models/groupMessage");
const { userAuth } = require("../middlewares/auth");
const { sendPushNotification } = require("../utils/push");

const groupRouter = express.Router();

// Create a new group
groupRouter.post("/group", userAuth, async (req, res) => {
  try {
    const { name, description, lat, lng } = req.body;
    const loggedInUser = req.user;

    if (!name || !lat || !lng) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const group = new Group({
      name,
      description,
      creatorId: loggedInUser._id,
      members: [loggedInUser._id],
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
    });

    await group.save();

    res.status(201).json({ success: true, message: "Group created successfully", data: group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get nearby groups
groupRouter.get("/groups/nearby", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    if (!loggedInUser.location || !loggedInUser.location.coordinates || loggedInUser.location.coordinates[0] === 0) {
      return res.status(400).json({ success: false, message: "Location is required" });
    }

    const [lng, lat] = loggedInUser.location.coordinates;
    const maxDistance = parseInt(req.query.distance) || 20000;

    const groups = await Group.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance",
          maxDistance: maxDistance,
          spherical: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "creatorId",
          foreignField: "_id",
          as: "creator",
        },
      },
      { $unwind: "$creator" },
      {
        $project: {
          name: 1,
          description: 1,
          members: 1,
          location: 1,
          distance: 1,
          "creator.firstName": 1,
          "creator.lastName": 1,
          "creator.photoUrl": 1,
        },
      },
      { $limit: 50 },
    ]);

    res.json({ success: true, data: groups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Join a group
groupRouter.post("/group/:groupId/join", userAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const loggedInUser = req.user;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    if (!group.members.includes(loggedInUser._id)) {
      group.members.push(loggedInUser._id);
      await group.save();
    }

    res.json({ success: true, message: "Joined group successfully", data: group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get group messages
groupRouter.get("/group/:groupId/messages", userAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const loggedInUser = req.user;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    if (!group.members.includes(loggedInUser._id)) {
      return res.status(403).json({ success: false, message: "You are not a member of this group" });
    }

    const messages = await GroupMessage.find({ groupId })
      .populate("senderId", "firstName lastName photoUrl")
      .sort({ createdAt: 1 });

    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get groups user belongs to
groupRouter.get("/user/groups", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    
    const groups = await Group.find({ members: loggedInUser._id })
      .populate("creatorId", "firstName photoUrl")
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: groups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = groupRouter;
