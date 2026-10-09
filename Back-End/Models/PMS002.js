// src/Models/EquipmentHistory.js
const mongoose = require("mongoose");

const equipmentpms002 = new mongoose.Schema(
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
            type: String,
            trim: true,
            default: "",
        },

        lubrication: {
            type: Boolean,
            default: false,
        },

        overhauling: {
            type: Boolean,
            default: false,
        },

        minorAdjustment: {
            type: Boolean,
            default: false,
        },

        replaceWornOutParts: {
            type: Boolean,
            default: false,
        },

        repair: {
            type: Boolean,
            default: false,
        },

        generalRecondition: {
            type: Boolean,
            default: false,
        },

        repairPart: {
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
        timestamps: true,
    }
);

equipmentpms002.index({ equipmentId: 1 });

const EquipmentHistory = mongoose.model(
    "pms002",
    equipmentpms002
);

module.exports = EquipmentHistory;