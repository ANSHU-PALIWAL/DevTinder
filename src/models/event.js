const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxLength: 100,
    },
    description: {
      type: String,
      required: true,
      maxLength: 500,
    },
    eventType: {
      type: String,
      enum: ["Sports", "Garage Sale", "Meetup", "Lost & Found", "Other"],
      default: "Other",
    },
    date: {
      type: Date,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    rsvpList: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// Create 2dsphere index on location for GeoNear queries
eventSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Event", eventSchema);
