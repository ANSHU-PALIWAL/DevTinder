const express = require("express");
const mongoose = require("mongoose");
const Event = require("../models/event");
const { userAuth } = require("../middlewares/auth");

const eventRouter = express.Router();

// 1. Create a local event
eventRouter.post("/event", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { title, description, eventType, date, lat, lng } = req.body;

    if (!title || !description || !date || !lat || !lng) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const newEvent = new Event({
      creatorId: loggedInUser._id,
      title,
      description,
      eventType: eventType || "Other",
      date,
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)]
      },
      rsvpList: [loggedInUser._id] // Creator is automatically RSVP'd
    });

    await newEvent.save();

    res.json({ success: true, message: "Event created successfully.", data: newEvent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Fetch nearby events
eventRouter.get("/events/nearby", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    if (
      !loggedInUser.location ||
      !loggedInUser.location.coordinates ||
      loggedInUser.location.coordinates[0] === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Location is required to find local events.",
      });
    }

    const [lng, lat] = loggedInUser.location.coordinates;
    const maxDistance = parseInt(req.query.distance) || 20000; // Default 20km for events

    const nearbyEvents = await Event.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance",
          maxDistance: maxDistance,
          spherical: true,
          // Only show future events
          query: {
            date: { $gte: new Date() }
          }
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "creatorId",
          foreignField: "_id",
          as: "creator",
        }
      },
      {
        $unwind: "$creator"
      },
      {
        $project: {
          title: 1,
          description: 1,
          eventType: 1,
          date: 1,
          location: 1,
          distance: 1,
          rsvpList: 1,
          "creator.firstName": 1,
          "creator.lastName": 1,
          "creator.photoUrl": 1,
          "creator._id": 1,
        }
      },
      { $limit: 100 }
    ]);

    res.json({
      success: true,
      message: "Events Fetched Successfully",
      data: nearbyEvents,
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. RSVP to an event
eventRouter.post("/event/:eventId/rsvp", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    // Toggle RSVP
    const isRSVPd = event.rsvpList.includes(loggedInUser._id);
    
    if (isRSVPd) {
      event.rsvpList.pull(loggedInUser._id);
    } else {
      event.rsvpList.push(loggedInUser._id);
    }

    await event.save();

    res.json({ 
      success: true, 
      message: isRSVPd ? "RSVP cancelled." : "RSVP successful.",
      isRSVPd: !isRSVPd
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = eventRouter;
