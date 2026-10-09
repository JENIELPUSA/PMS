// src/Models/EquipmentHistory.js
const mongoose = require("mongoose");

const equipmentPms004Schema = new mongoose.Schema(
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
        // Optional fields (existing)
        Spare_Parts: {
            type: String,
            trim: true,
            default: "",
        },
        Man_hour_used: {
            type: String,
            trim: true,
            default: "",
        },
        Problem_Encounter: {
            type: String,
            trim: true,
            default: "",
        },
        incharge: { type: String, trim: true, default: "" },

        // Date ng maintenance
        Date: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes para mabilis ang query
equipmentPms004Schema.index({ equipmentId: 1 });
equipmentPms004Schema.index({ laboratoryId: 1 });
equipmentPms004Schema.index({ Date: -1 });
equipmentPms004Schema.index({ equipmentId: 1, laboratoryId: 1 });

// Virtual para sa populated performedBy (kung magiging ref sa future)
equipmentPms004Schema.virtual("performedByFullName").get(function () {
    if (!this.performedBy) return "";
    if (typeof this.performedBy === "string") return this.performedBy;
    return [
        this.performedBy.FirstName,
        this.performedBy.Middle,
        this.performedBy.LastName,
    ]
        .filter(Boolean)
        .join(" ")
        .trim();
});

// Siguraduhing kasama ang virtuals kapag nag-`toJSON` / `toObject`
equipmentPms004Schema.set("toJSON", { virtuals: true });
equipmentPms004Schema.set("toObject", { virtuals: true });

const EquipmentHistory = mongoose.model(
    "pms005",
    equipmentPms004Schema
);

module.exports = EquipmentHistory;