// src/Models/EquipmentHistory.js  (o src/Models/PMS003.js)
const mongoose = require("mongoose");

const equipmentpms003 = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: [true, "Date is required"],
        },
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

        // ✅ WORK DONE fields
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

        // ✅ BAGONG DAGDAG — personnel
        performedBy: {
            type: String,
            trim: true,
            default: "",
        },
        checkedBy: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

// ✅ Indexes
equipmentpms003.index({ equipmentId: 1 });
equipmentpms003.index({ laboratoryId: 1 });

const EquipmentHistory = mongoose.model(
    "pms003",
    equipmentpms003
);

module.exports = EquipmentHistory;