const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverEncryptedData: {
      type: String,
      required: true,
    },
    senderEncryptedData: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast history queries
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ receiverId: 1, senderId: 1 });

module.exports = mongoose.model("Message", messageSchema);
