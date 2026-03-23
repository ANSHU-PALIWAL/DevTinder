const validator = require("validator");

const validateSignUpData = (req) => {
  const { firstName, lastName, emailId, password } = req.body;

  if (!firstName || !lastName) {
    throw new Error("Please provide both your first and last name.");
  } else if (!validator.isEmail(emailId)) {
    throw new Error("Please enter a valid email address.");
  } else if (!validator.isStrongPassword(password)) {
    throw new Error(
      "Please use a stronger password (include uppercase, numbers, and symbols).",
    );
  }
};

const validateEditProfileData = (req) => {
  const allowedEditFields = [
    "firstName",
    "lastName",
    "emailId",
    "photoUrl",
    "gallery",
    "mobileNumber",
    "location", // 🌍 ADDED: Allow location updates!
    "gender",
    "age",
    "about",
    "skills",
  ];

  const isEditAllowed = Object.keys(req.body).every((field) =>
    allowedEditFields.includes(field),
  );

  return isEditAllowed;
};

module.exports = {
  validateSignUpData,
  validateEditProfileData,
};
