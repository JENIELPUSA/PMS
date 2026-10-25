// src/Models/InstrumentCalibration.js
import mongoose from "mongoose";

const equipmentpms007Schema = new mongoose.Schema(
    {
        equipmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Equipment",
            required: [true, "Equipment ID is required"],
        },
        laboratoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Laboratory",
            required: [true, "Laboratory ID is required"],
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        performedByFullName: { type: String, trim: true, default: "" },

        // ==========================================
        // PMS 007 SPECIFIC FIELDS
        // ==========================================
        codeNo: { type: String, trim: true, default: "" },
        instrumentName: { type: String, trim: true, default: "" },
        instrumentType: { type: String, trim: true, default: "" },
        accuracy: { type: String, trim: true, default: "" },

        // Error field na hinati sa dalawa base sa image
        errorObserved: { type: String, trim: true, default: "" },
        errorCorrected: { type: String, trim: true, default: "" },

        calibratedBy: { type: String, trim: true, default: "" },
        remarks: { type: String, trim: true, default: "" },

        // Date of calibration
        date: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// ==========================================
// INDEXES (Pareho sa PMS 006 pattern)
// ==========================================
equipmentpms007Schema.index({ equipmentId: 1 });
equipmentpms007Schema.index({ laboratoryId: 1 });
equipmentpms007Schema.index({ date: -1 }); // Date of calibration
equipmentpms007Schema.index({ equipmentId: 1, laboratoryId: 1 });
equipmentpms007Schema.index({ laboratoryId: 1, date: -1 });
equipmentpms007Schema.index({ equipmentId: 1, date: -1 });

// ==========================================
// VIRTUALS & JSON SETTINGS
// ==========================================
equipmentpms007Schema.set("toJSON", { virtuals: true });
equipmentpms007Schema.set("toObject", { virtuals: true });

// ==========================================
// MODEL EXPORT
// ==========================================
// Gagamitin natin ang "pms007" bilang pangalan ng collection/model
const InstrumentCalibration = mongoose.model("pms007", equipmentpms007Schema);

export default InstrumentCalibration;