require("dotenv").config();
const webpush = require("web-push");
const User = require("../models/user");

webpush.setVapidDetails(
  "mailto:" + process.env.SMTP_FROM_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Sends a push notification to a specific user.
 * @param {string} userId - The MongoDB ObjectId of the target user
 * @param {object} payload - The notification payload (title, body, icon, url)
 */
const sendPushNotification = async (userId, payload) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return; // User has no push subscriptions
    }

    const payloadString = JSON.stringify(payload);

    // Send to all devices the user has subscribed with
    const notifications = user.pushSubscriptions.map(async (sub, index) => {
      try {
        await webpush.sendNotification(sub, payloadString);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription has expired or is no longer valid, remove it
          user.pushSubscriptions.splice(index, 1);
          await user.save();
        } else {
          console.error("Push Notification Error:", err);
        }
      }
    });

    await Promise.all(notifications);
  } catch (err) {
    console.error("Error sending push notification:", err);
  }
};

module.exports = { sendPushNotification };
