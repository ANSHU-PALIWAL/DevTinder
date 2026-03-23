const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: 1,
      maxLength: 50,
    },
    lastName: {
      type: String,
      // required: false,
      minLength: 1,
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
      validate(value) {
        if (value && !validator.isStrongPassword(value)) {
          throw new Error("Enter A Strong Password: " + value);
        }
      },
    },
    age: {
      type: Number,
      min: 18,
      max: 99,
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other"],
        message: `{VALUE} is not a valid gender type`,
      },
      lowercase: true,
      trim: true,
    },
    photoUrl: {
      type: String,
      default:
        "https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg",
      validate(value) {
        if (!value.startsWith("http") && !value.startsWith("data:image")) {
          throw new Error("Invalid Photo URL format");
        }
      },
    },
    gallery: {
      type: [String],
      default: [],
      validate: [
        {
          validator: function (val) {
            return val.length <= 4;
          },
          message: "You can only upload a maximum of 4 gallery images.",
        },
      ],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    about: {
      type: String,
      minLength: 3,
      maxLength: 100,
      default: "This is a default about of the user",
    },
    skills: {
      type: [String],
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ firstName: 1, lastname: 1, gender: 1, age: 1 });

userSchema.index({ location: "2dsphere" });

userSchema.methods.getJWT = async function () {
  const user = this;

  const token = await jwt.sign({ _id: user._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
  });

  return token;
};

userSchema.methods.validatePassword = async function (passwordInputByUser) {
  const user = this;
  const passwordHash = user.password;

  if (!passwordHash) return false;

  const isPasswordValid = await bcrypt.compare(
    passwordInputByUser,
    passwordHash,
  );

  return isPasswordValid;
};

module.exports = mongoose.model("User", userSchema);
