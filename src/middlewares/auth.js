const jwt = require("jsonwebtoken");
const User = require("../models/user");

const userAuth = async (req, res, next) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      // 🛡️ FIX: Standardized JSON response
      return res.status(401).json({
        success: false,
        message: "Please Login To Access This Resource",
      });
    }

    const decodedObj = await jwt.verify(token, "Dev@Tinder$790");
    const { _id } = decodedObj;

    const user = await User.findById(_id);

    if (!user) {
      throw new Error("User Not Found");
    }

    req.user = user;
    next();
  } catch (err) {
    // 🛡️ FIX: Always return 401 for Auth failures so the Frontend 'Bouncer' catches it!
    res.status(401).json({
      success: false,
      message: "Session expired or invalid. Please login again.",
    });
  }
};

module.exports = {
  userAuth,
};
