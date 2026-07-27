const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const Message = require("../models/message");
const GroupMessage = require("../models/groupMessage");
const Group = require("../models/group");
const User = require("../models/user");
const ConnectionRequest = require("../models/connectionRequest");
const { sendPushNotification } = require("./push");

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.request.headers.cookie || "");
      const token = cookies.token;
      
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decodedObj = await jwt.verify(token, process.env.JWT_SECRET_KEY);
      const user = await User.findById(decodedObj._id);

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication error: " + err.message));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    
    // Join a room unique to this user to receive private messages/calls
    socket.join(userId);

    // Handle sending a text message
    socket.on("sendMessage", async ({ receiverId, receiverEncryptedData, senderEncryptedData }, callback) => {
      try {
        // 1. Verify connection exists and is accepted
        const connection = await ConnectionRequest.findOne({
          $or: [
            { fromUserId: userId, toUserId: receiverId, status: "accepted" },
            { fromUserId: receiverId, toUserId: userId, status: "accepted" },
          ],
        });

        if (!connection) {
          if (callback) callback({ status: "error", message: "Not connected with this user." });
          return;
        }

        // 2. Save message to database
        const message = new Message({
          senderId: userId,
          receiverId: receiverId,
          receiverEncryptedData,
          senderEncryptedData,
        });
        await message.save();

        // 3. Emit message to the receiver if they are online
        io.to(receiverId).emit("receiveMessage", {
          _id: message._id,
          senderId: userId,
          receiverId: receiverId,
          receiverEncryptedData,
          createdAt: message.createdAt,
        });

        // Send push notification to receiver
        const sender = await User.findById(userId).select("firstName photoUrl");
        sendPushNotification(receiverId, {
          title: `New Message from ${sender.firstName}`,
          body: "You received a new end-to-end encrypted message.",
          icon: sender.photoUrl || "/Logo500.png",
          url: `/chat/${userId}`
        });

        if (callback) callback({ status: "success", message });

      } catch (err) {
        console.error("Socket error in sendMessage:", err);
        if (callback) callback({ status: "error", message: err.message });
      }
    });

    // Handle joining a group chat room
    socket.on("joinGroup", async ({ groupId, userId }, callback) => {
      try {
        const group = await Group.findById(groupId);
        if (group && group.members.includes(userId)) {
          socket.join(`group_${groupId}`);
          if (callback) callback({ status: "success" });
        } else {
          if (callback) callback({ status: "error", message: "Not authorized" });
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Handle sending a group message
    socket.on("sendGroupMessage", async ({ groupId, userId, text }, callback) => {
      try {
        const group = await Group.findById(groupId);
        if (!group || !group.members.includes(userId)) {
          return callback({ status: "error", message: "Not authorized" });
        }

        const message = new GroupMessage({
          groupId,
          senderId: userId,
          text,
        });

        const savedMessage = await message.save();
        await savedMessage.populate("senderId", "firstName lastName photoUrl");

        // Broadcast to everyone in the room
        io.to(`group_${groupId}`).emit("receiveGroupMessage", savedMessage);

        if (callback) callback({ status: "success", message: savedMessage });
      } catch (err) {
        console.error(err);
        if (callback) callback({ status: "error", message: err.message });
      }
    });

    // Handle WebRTC Signaling for P2P Calls/Media
    socket.on("webrtcSignal", ({ to, signal }) => {
      // Forward the WebRTC signal (offer/answer/ice candidate) to the target user
      socket.to(to).emit("webrtcSignal", {
        from: userId,
        signal,
      });
    });

    socket.on("disconnect", () => {
      // Socket automatically leaves rooms upon disconnect
    });
  });
};

module.exports = { initializeSocket };
