// src/Models/EquipmentHistory.js
const mongoose = require("mongoose");

const equipmentpms004 = new mongoose.Schema(
    {
        // Reference sa Equipment model
        equipmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Equipment",
            required: [true, "Equipment ID is required"],
        },
        // Reference sa Laboratory model
        laboratoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Laboratory",
            required: [true, "Laboratory ID is required"],
        },
        routineInspection: {
            type: Boolean,
            default: false,
        },

        lubrication: {
            type: Boolean,
            default: false,
        },
        minorAdjustment: {
            type: Boolean,
            default: false,
        },

        repair: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

equipmentpms004.index({ equipmentId: 1 });

const EquipmentHistory = mongoose.model(
    "pms004",
    equipmentpms004
);

module.exports = EquipmentHistory;