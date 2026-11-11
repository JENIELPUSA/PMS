const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    trim: true,
    required: [true, "please fill out the Textbox"]
  },
  FirstName: String,
  Middle: String,
  LastName: String,
  role: {
    type: String,
    enum: ['User', 'Admin', 'Technician','Supply','pmsAdmin'],
    required: [true, "Please Select a Role"]
  },
  password: {
    type: String,
    required: [true, 'Please enter a password.'],
    minlength: [8, 'Password must be at least 8 characters long.'],
    select: false, 
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetTokenExpires: Date
});
// Mongoose pre-save middleware to hash the password and remove confirmPassword
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // Hash the new password with a cost factor of 12
  this.password = await bcrypt.hash(this.password, 12);

  next();
});

// Method to compare passwords
userSchema.methods.comparePasswordInDb = async function (pswd, pswdDB) {
  return await bcrypt.compare(pswd, pswdDB);
};

// Method to check if the password was changed after the token was issued
userSchema.methods.isPasswordChanged = async function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const pswdChangedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000
    );
    return JWTTimestamp < pswdChangedTimestamp;
  }
  return false;
};

// Method to create a password reset token
userSchema.methods.createResetTokenPassword = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000; // Token valid for 10 minutes

  return resetToken;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
