const express = require("express");
const User = require("../models/user");
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");

const userRouter = express.Router();

const USER_SAFE_Data = "firstName lastName photoUrl age gender about skills";

// 1. GET PENDING REQUESTS
userRouter.get("/user/requests/received", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionRequests = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested",
    }).populate("fromUserId", USER_SAFE_Data);

    // 🛡️ FIX: Filter out any requests where the sender deleted their account
    const validRequests = connectionRequests.filter(
      (req) => req.fromUserId != null,
    );

    res.json({
      message: "Data Fetched Successfully",
      data: validRequests,
    });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
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

    // 🛡️ FIX: Map over connections and handle null (deleted) users safely
    const data = connectionRequests
      .map((row) => {
        // If either user doesn't exist anymore, return null
        if (!row.fromUserId || !row.toUserId) {
          return null;
        }

        // Standard logic to return the *other* person's profile
        if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
          return row.toUserId;
        }
        return row.fromUserId;
      })
      .filter((user) => user !== null); // This removes all the 'null' ghost connections from the final array

    res.json({
      data: data,
    });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
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
      // 🛡️ FIX: Make sure the IDs exist before adding them to the Set
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
      data: users,
    });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

module.exports = userRouter;
