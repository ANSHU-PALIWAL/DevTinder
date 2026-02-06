const mongoose = require("mongoose");

const connectDB = async () => {
  await mongoose.connect(
    "mongodb+srv://priyanshupaliwal_db_user:z9NBdTTWdmWBUBeI@cluster1.9wyaoat.mongodb.net/devTinder",
  );
};

module.exports = connectDB;
