// src/Models/EquipmentHistory.js  (o src/Models/PMS004.js)
const mongoose = require("mongoose");

const equipmentpms004 = new mongoose.Schema(
    {
        // ✅ FK sa PMS001
        pms001Id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PMS001",
            required: [true, "PMS001 ID is required"],
            index: true,
        },

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

// ✅ Indexes
equipmentpms004.index({ equipmentId: 1 });
equipmentpms004.index({ pms001Id: 1 });        // ✅ bagong index
equipmentpms004.index({ laboratoryId: 1 });

const EquipmentHistory = mongoose.model(
    "pms004",
    equipmentpms004
);

module.exports = EquipmentHistory;