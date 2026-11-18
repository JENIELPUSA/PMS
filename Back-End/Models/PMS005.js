// src/Models/PMS005.js
const mongoose = require("mongoose");

const pms005Schema = new mongoose.Schema(
    {
        // ✅ FK sa PMS001
        pms001Id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PMS001",
            required: [true, "PMS001 ID is required"],
            unique: true,          // ✅ UNIQUE para sa upsert
            index: true,
        },

        // FK sa Equipment
        equipmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Equipment",
            required: [true, "Equipment ID is required"],
        },

        // FK sa Laboratory
        laboratoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Laboratory",
            required: [true, "Laboratory ID is required"],
        },

        // ✅ Optional fields
        Spare_Parts: {
            type: String,
            trim: true,
            default: "",
        },

        // ✅ NUMBER na (dati String)
        Man_hour_used: {
            type: Number,
            min: 0,
            default: null,
        },

        Problem_Encounter: {
            type: String,
            trim: true,
            default: "",
        },

        // ✅ Tech / Lab In-Charge (String name)
        Tech_Lab_InCharge: {
            type: String,
            trim: true,
            default: "",
        },

        // ✅ PMS number (kung may generator sa pre-save)
        pmsNo: {
            type: String,
            trim: true,
        },

        // Date ng maintenance
        Date: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ✅ Indexes
pms005Schema.index({ equipmentId: 1 });
pms005Schema.index({ laboratoryId: 1 });
pms005Schema.index({ Date: -1 });
pms005Schema.index({ equipmentId: 1, laboratoryId: 1 });

// ✅ Virtual para sa Tech / Lab In-Charge
pms005Schema.virtual("techLabInChargeFullName").get(function () {
    if (!this.Tech_Lab_InCharge) return "";
    if (typeof this.Tech_Lab_InCharge === "string") {
        return this.Tech_Lab_InCharge;
    }
    return [
        this.Tech_Lab_InCharge.FirstName,
        this.Tech_Lab_InCharge.Middle,
        this.Tech_Lab_InCharge.LastName,
    ]
        .filter(Boolean)
        .join(" ")
        .trim();
});

// ✅ Pre-save hook para sa pmsNo (kung wala pang ibang generator)
pms005Schema.pre("save", async function (next) {
    if (this.isNew && !this.pmsNo) {
        try {
            const count = await this.constructor.countDocuments();
            this.pmsNo = String(count + 1).padStart(5, "0");
        } catch (err) {
            return next(err);
        }
    }
    next();
});

const PMS005 = mongoose.model("pms005", pms005Schema);

module.exports = PMS005;