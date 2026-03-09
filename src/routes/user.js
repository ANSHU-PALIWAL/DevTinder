const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");

const userRouter = express.Router();

// 🛡️ Added gallery so it's visible everywhere!
const USER_SAFE_Data =
  "firstName lastName photoUrl age gender about skills gallery";

// 1. GET PENDING REQUESTS
userRouter.get("/user/requests/received", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionRequests = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested",
    }).populate("fromUserId", USER_SAFE_Data);

    const validRequests = connectionRequests.filter(
      (req) => req.fromUserId != null,
    );

    res.json({
      success: true,
      message: "Data Fetched Successfully",
      data: validRequests,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 1.5 GET SENT REQUESTS
userRouter.get("/user/requests/sent", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionRequests = await ConnectionRequest.find({
      fromUserId: loggedInUser._id,
      status: "interested",
    }).populate("toUserId", USER_SAFE_Data);

    const validRequests = connectionRequests.filter(
      (req) => req.toUserId != null,
    );

    res.json({
      success: true,
      message: "Sent Requests Fetched Successfully",
      data: validRequests,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 2. GET ACCEPTED CONNECTIONS
userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionRequests = await ConnectionRequest.find({
      $or: [
        { toUserId: loggedInUser._id, status: "accepted" },
        { fromUserId: loggedInUser._id, status: "accepted" },
      ],
    })
      .populate("fromUserId", USER_SAFE_Data)
      .populate("toUserId", USER_SAFE_Data);

    const data = connectionRequests
      .map((row) => {
        if (!row.fromUserId || !row.toUserId) {
          return null;
        }
        if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
          return row.toUserId;
        }
        return row.fromUserId;
      })
      .filter((user) => user !== null);

    res.json({
      success: true,
      message: "Connections Fetched Successfully",
      data: data,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 3. GET FEED
userRouter.get("/feed", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    limit = limit > 50 ? 50 : limit;
    const skip = (page - 1) * limit;

    const connectionRequests = await ConnectionRequest.find({
      $or: [{ fromUserId: loggedInUser._id }, { toUserId: loggedInUser._id }],
    }).select("fromUserId toUserId");

    const hideUsersFromFeed = new Set();

    connectionRequests.forEach((req) => {
      if (req.fromUserId) hideUsersFromFeed.add(req.fromUserId.toString());
      if (req.toUserId) hideUsersFromFeed.add(req.toUserId.toString());
    });

    const users = await User.find({
      $and: [
        { _id: { $nin: Array.from(hideUsersFromFeed) } },
        { _id: { $ne: loggedInUser._id } },
      ],
    })
      .select(USER_SAFE_Data)
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      message: "Feed Fetched Successfully",
      data: users,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 🌍 4. GET RADAR FEED (Nearby Users)
userRouter.get("/feed/radar", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    // Safety check: Does the user have a location set?
    if (
      !loggedInUser.location ||
      !loggedInUser.location.coordinates ||
      loggedInUser.location.coordinates[0] === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please enable location services in your browser to see developers near you.",
      });
    }

    const [lng, lat] = loggedInUser.location.coordinates;

    // 1. Find users we already swiped on to hide them from the radar
    const connectionRequests = await ConnectionRequest.find({
      $or: [{ fromUserId: loggedInUser._id }, { toUserId: loggedInUser._id }],
    }).select("fromUserId toUserId");

    const hideUsersFromFeed = new Set([loggedInUser._id.toString()]); // Also hide ourselves!

    connectionRequests.forEach((req) => {
      if (req.fromUserId) hideUsersFromFeed.add(req.fromUserId.toString());
      if (req.toUserId) hideUsersFromFeed.add(req.toUserId.toString());
    });

    // Convert string IDs to MongoDB ObjectIds for the aggregation pipeline
    const hiddenUsersIds = Array.from(hideUsersFromFeed).map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    // Default radar radius to 100km (100,000 meters)
    const maxDistance = parseInt(req.query.distance) || 100000;

    // 2. The Magic GeoNear Aggregation
    const nearbyUsers = await User.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance", // This automatically calculates and attaches the distance in meters!
          maxDistance: maxDistance,
          spherical: true,
          query: {
            _id: { $nin: hiddenUsersIds }, // Don't show users we've already swiped on
          },
        },
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          photoUrl: 1,
          age: 1,
          gender: 1,
          about: 1,
          skills: 1,
          gallery: 1,
          distance: 1, // Keep the calculated distance
        },
      },
      { $limit: 15 }, // Max 15 people on the radar to prevent UI clutter
    ]);

    res.json({
      success: true,
      message: "Radar Fetched Successfully",
      data: nearbyUsers,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = userRouter;
