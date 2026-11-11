// src/Models/EquipmentHistory.js
const mongoose = require("mongoose");

const equipmentpms002 = new mongoose.Schema(
    {
        // ✅ PMS# increment (auto-generated)
        pmsNo: {
            type: Number,
            default: 0,
        },

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

// ✅ Indexes
equipmentpms002.index({ equipmentId: 1 });
equipmentpms002.index({ pms001Id: 1 });          // ✅ bagong index
equipmentpms002.index({ laboratoryId: 1, pmsNo: 1 });

// ✅ PRE-SAVE HOOK — Auto-increment pmsNo
equipmentpms002.pre("save", async function (next) {
    if (!this.isNew) return next();
    if (this.pmsNo && this.pmsNo > 0) return next();

    try {
        const lastRecord = await this.constructor
            .findOne({ laboratoryId: this.laboratoryId })
            .sort({ pmsNo: -1 })
            .select("pmsNo")
            .lean();

        this.pmsNo = (lastRecord?.pmsNo || 0) + 1;

        next();
    } catch (err) {
        next(err);
    }
});

const EquipmentHistory = mongoose.model("pms002", equipmentpms002);
module.exports = EquipmentHistory;