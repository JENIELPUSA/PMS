// src/Models/EquipmentHistory.js
const mongoose = require("mongoose");

const equipmentpms001 = new mongoose.Schema(
    {
        // Reference sa Equipment model
        equipmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Equipment",
            required: [true, "Equipment ID is required"],
        },
        // Reference sa Equipment model
        laboratoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Equipment",
            required: [true, "Equipment ID is required"],
        },
        // Status fields
        serviceable: {
            type: Boolean,
            default: false,
        },

        nonServiceable: {
            type: Boolean,
            default: false,
        },

        // Type of equipment/tool
        type: {
            type: String,
            trim: true,
            default: "",
        },

        // Breakdown info
        breakdownNo: {
            type: String,
            trim: true,
            default: "0",
        },

        breakdownDuration: {
            type: String,
            trim: true,
            default: "N/A",
        },

        // Availability & Utilization
        availYes: {
            type: Boolean,
            default: false,
        },

        availNo: {
            type: Boolean,
            default: false,
        },

        // Remarks
        remarks: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true, // createdAt & updatedAt
    }
);

// Optional: index para mabilis ang query by equipmentId
equipmentpms001.index({ equipmentId: 1 });

const EquipmentHistory = mongoose.model(
    "pms001",
    equipmentpms001
);

module.exports = EquipmentHistory;