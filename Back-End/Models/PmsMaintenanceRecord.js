// models/MaintenanceRecord.js
const mongoose = require("mongoose");

const maintenanceRecordSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            trim: true,
            // unique: true,
            // required: [true, "Code is required"],
        },
        EquipmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Equipment",
            required: [true, "Equipment ID is required"],
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required"],
        },
        problemencounter: {
            type: String,
            trim: true,
        }, 
        spareparts_materialuse: {
            type: String,
            trim: true,
        },
        // Maintenance type flags
        Lubrication: { type: Boolean, default: false },
        Overhauling: { type: Boolean, default: false },
        Replace_worn_out_parts: { type: Boolean, default: false },
        General_Recondition: { type: Boolean, default: false },
        RepairParts: { type: Boolean, default: false },
        MinorAdjustment: { type: Boolean, default: false },
        Repair: { type: Boolean, default: false },
        remarks: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("MaintenanceRecord", maintenanceRecordSchema);