const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: 3,
      maxLength: 50,
    },
    lastName: {
      type: String,
      required: true,
      minLength: 3,
      maxLength: 50,
    },
    emailId: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      trim: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid Email Address: " + value);
        }
      },
    },
    password: {
      type: String,
      required: true,
      validate(value) {
        if (!validator.isStrongPassword(value)) {
          throw new Error("Enter A Strong Password: " + value);
        }
      },
    },
    age: {
      type: Number,
      min: 18,
    },
    gender: {
      type: String,
      validate(value) {
        if (!["male", "female", "others"].includes(value)) {
          throw new Error("Gender Is Not Valid: " + value);
        }
      },
    },
    photoUrl: {
      type: String,
      default:
        "https://cdn.vectorstock.com/i/500p/46/76/gray-male-head-placeholder-vector-23804676.jpg",
      validate(value) {
        if (!validator.isURL(value)) {
          throw new Error("Invalid Photo URl: " + value);
        }
      },
    },
    about: {
      type: String,
      minLength: 3,
      maxLength: 50,
      default: "This is a defualt about of the user",
    },
    skills: {
      type: [String],
    },
  },
  {
    timestamps: true,
  },
);

userSchema.methods.getJWT = async function () {
  const user = this;

  const token = await jwt.sign({ _id: user._id }, "Dev@Tinder$790", {
    expiresIn: "7d",
  });

  return token;
};

userSchema.methods.validatePassword = async function (passwordInputByUser) {
  const user = this;
  const passwordHash = user.password;

  const isPasswordValid = await bcrypt.compare(
    passwordInputByUser,
    passwordHash,
  );

  return isPasswordValid;
};

module.exports = mongoose.model("User", userSchema);
