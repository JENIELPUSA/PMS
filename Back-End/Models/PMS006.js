// src/Models/EquipmentHistory.js
import mongoose from "mongoose";

const equipmentpms006Schema = new mongoose.Schema(
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
        analysisTrouble: { type: String, trim: true, default: "" },
        adjustmentSetting: { type: String, trim: true, default: "" },
        manHourUse: { type: String, trim: true, default: "" },
        counterMeasures: { type: String, trim: true, default: "" },
        improvementRepairProcedure: { type: String, trim: true, default: "" },
        sparePartsMaterialsUsed: { type: String, trim: true, default: "" },
        incharge: { type: String, trim: true, default: "" },
        maintenanceDate: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

equipmentpms006Schema.index({ equipmentId: 1 });
equipmentpms006Schema.index({ laboratoryId: 1 });
equipmentpms006Schema.index({ maintenanceDate: -1 });
equipmentpms006Schema.index({ equipmentId: 1, laboratoryId: 1 });
equipmentpms006Schema.index({ laboratoryId: 1, maintenanceDate: -1 });
equipmentpms006Schema.index({ equipmentId: 1, maintenanceDate: -1 });

equipmentpms006Schema.set("toJSON", { virtuals: true });
equipmentpms006Schema.set("toObject", { virtuals: true });

const EquipmentHistory = mongoose.model("pms006", equipmentpms006Schema);

export default EquipmentHistory;