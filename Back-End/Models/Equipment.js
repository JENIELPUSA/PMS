const mongoose = require("mongoose");

// Define Equipment Schema and Model
const EquipmentSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Please input a Brand!"],
    },
    DateTime: {
      type: Date,
      default: () => new Date(), // Automatically set current date and time
    },
    Brand: {
      type: String,
      required: [true, "Please input a Brand!"],
    },
    SerialNumber: {
      type: String,
      required: [true, "Please input a SerialNumber!"],
      unique: true,
    },
    Specification: {
      type: String,
      required: [true, "Please input a Specification!"],
    },
    status: {
      type: String,
      enum: ["Not Available", "Available"],
      default: "Available",
    },
    Category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: "Active",
    },
    remarks: {
      type: String
    },
    DateAcquired: {
      type: Date
    }
  },
  { timestamps: true },
);

const Equipment = mongoose.model("Equipment", EquipmentSchema);

module.exports = Equipment;
