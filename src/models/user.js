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
      max: 99,
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other"],
        message: `{VALUE} is not a vaid gender type`,
      },
      lowercase: true,
      trim: true,
    },
    photoUrl: {
      type: String,
      default:
        "https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg",
      validate(value) {
        // Allow the default image, standard HTTP URLs, OR Base64 Data URIs
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
            return val.length <= 4; // 🛡️ Reality Check: Max 4 images to prevent DB crash!
          },
          message: "You can only upload a maximum of 4 gallery images.",
        },
      ],
    },
    about: {
      type: String,
      minLength: 3,
      maxLength: 100,
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

userSchema.index({ firstName: 1, lastname: 1, gender: 1, age: 1 });

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
