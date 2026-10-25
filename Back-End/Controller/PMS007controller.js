// src/Controllers/PMS007Controller.js
import AsyncErrorHandler from "../Utils/AsyncErrorHandler.js";
import mongoose from "mongoose";
import CustomError from "../Utils/CustomError.js";
import PMS007 from "../Models/PMS007.js"; 
import Equipment from "../Models/Equipment.js";
import Laboratory from "../Models/Laboratory.js";

// ============================================================
// HELPER — validate ObjectId
// ============================================================
const validateObjectId = (id, fieldName) => {
    if (!id) throw new CustomError(`${fieldName} is required`, 400);
    if (!mongoose.Types.ObjectId.isValid(id))
        throw new CustomError(`Invalid ${fieldName} format`, 400);
};

// ============================================================
// FindByEquipment
// ============================================================
export const FindByEquipment = AsyncErrorHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
        return res.status(400).json({
            status: "fail",
            message: "User ID not found in request.",
        });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const laboratory = await Laboratory.aggregate([
        { $match: { Encharge: userObjectId } },
        {
            $lookup: {
                from: "users",
                localField: "Encharge",
                foreignField: "_id",
                as: "Encharge",
            },
        },
        {
            $unwind: {
                path: "$Encharge",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $project: {
                _id: 1,
                LaboratoryName: { $ifNull: ["$LaboratoryName", "N/A"] },
                performedBy: {
                    _id: "$Encharge._id",
                    username: { $ifNull: ["$Encharge.username", ""] },
                    FirstName: { $ifNull: ["$Encharge.FirstName", ""] },
                    Middle: { $ifNull: ["$Encharge.Middle", ""] },
                    LastName: { $ifNull: ["$Encharge.LastName", ""] },
                    role: { $ifNull: ["$Encharge.role", ""] },
                },
            },
        },
        { $limit: 1 },
    ]);

    if (!laboratory || laboratory.length === 0) {
        return res.status(404).json({
            status: "fail",
            message: "No laboratory found for this user.",
        });
    }

    const laboratoryId = laboratory[0]._id;
    const performedBy = laboratory[0].performedBy || null;

    const { from, to, all } = req.query;
    const showAll = all === "true" || all === "1";

    if (!showAll && !from && !to) {
        return res.status(200).json({
            status: "success",
            pmsRecord: [],
            data: {
                _id: laboratoryId,
                LaboratoryName: laboratory[0].LaboratoryName,
                performedBy,
            },
        });
    }

    const dateFilter = {};

    if (!showAll && (from || to)) {
        dateFilter.date = {}; // ✅ Ginamit natin ang `date` field para sa PMS007

        if (from) {
            const fromDate = new Date(from);
            if (isNaN(fromDate.getTime())) {
                return res.status(400).json({
                    status: "fail",
                    message: "Invalid 'from' date format. Use YYYY-MM-DD.",
                });
            }
            fromDate.setHours(0, 0, 0, 0);
            dateFilter.date.$gte = fromDate;
        }

        if (to) {
            const toDate = new Date(to);
            if (isNaN(toDate.getTime())) {
                return res.status(400).json({
                    status: "fail",
                    message: "Invalid 'to' date format. Use YYYY-MM-DD.",
                });
            }
            toDate.setHours(23, 59, 59, 999);
            dateFilter.date.$lte = toDate;
        }
    }

    const pmsRecord = await PMS007.find({
        laboratoryId,
        ...dateFilter,
    })
        .populate("equipmentId")
        .populate("performedBy", "FirstName Middle LastName username role")
        .sort({ date: -1, createdAt: -1 }); // ✅ sort by `date`

    res.status(200).json({
        status: "success",
        pmsRecord,
        data: {
            _id: laboratoryId,
            LaboratoryName: laboratory[0].LaboratoryName,
            performedBy,
        },
    });
});

// ============================================================
// CREATE
// ============================================================
export const createPMS007 = AsyncErrorHandler(async (req, res, next) => {
    if (process.env.NODE_ENV !== "production") {
        console.log("🔍 req.body keys:", Object.keys(req.body || {}));
    }

    const {
        equipmentId,
        laboratoryId,
        codeNo,
        instrumentName,
        instrumentType,
        accuracy,
        errorObserved,
        errorCorrected,
        calibratedBy,
        date,
        remarks,
        performedByFullName,
    } = req.body;

    // `equipmentId` is optional for PMS007 if you're recording manual calibration
    if (equipmentId) validateObjectId(equipmentId, "Equipment ID");
    validateObjectId(laboratoryId, "Laboratory ID");

    if (date && isNaN(new Date(date).getTime())) {
        return next(new CustomError("Invalid date format", 400));
    }

    // Check equipment only if provided
    if (equipmentId) {
        const equipmentExists = await Equipment.findById(equipmentId);
        if (!equipmentExists) {
            return next(new CustomError("Equipment not found", 404));
        }
    }

    const laboratoryExists = await Laboratory.findById(laboratoryId);
    if (!laboratoryExists) {
        return next(new CustomError("Laboratory not found", 404));
    }

    const newRecord = await PMS007.create({
        equipmentId: equipmentId || null,
        laboratoryId,
        codeNo: codeNo || "",
        instrumentName: instrumentName || "",
        instrumentType: instrumentType || "",
        accuracy: accuracy || "",
        errorObserved: errorObserved || "",
        errorCorrected: errorCorrected || "",
        calibratedBy: calibratedBy || "",
        date: date || Date.now(),
        remarks: remarks || "",
        performedByFullName: performedByFullName || "",
        performedBy: req.user?._id || null,
    });

    if (!newRecord) {
        return next(new CustomError("Failed to create PMS007 record", 400));
    }

    const populated = await newRecord.populate([
        { path: "equipmentId" },
        { path: "laboratoryId" },
        { path: "performedBy", select: "FirstName Middle LastName username role" },
    ]);

    res.status(201).json({
        status: "success",
        data: populated,
    });
});

// ============================================================
// GET ALL
// ============================================================
export const getAllPMS007 = AsyncErrorHandler(async (req, res, next) => {
    const records = await PMS007.find()
        .populate("equipmentId")
        .populate("laboratoryId")
        .populate("performedBy", "FirstName Middle LastName username role")
        .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
        status: "success",
        totalRecords: records.length,
        data: records,
    });
});

// ============================================================
// GET BY ID
// ============================================================
export const getPMS007ById = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    const record = await PMS007.findById(req.params.id)
        .populate("equipmentId")
        .populate("laboratoryId")
        .populate("performedBy", "FirstName Middle LastName username role");

    if (!record) {
        return next(new CustomError("PMS007 record not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: record,
    });
});

// ============================================================
// GET BY EQUIPMENT ID
// ============================================================
export const getPMS007ByEquipmentId = AsyncErrorHandler(async (req, res, next) => {
    const { equipmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
        return next(new CustomError("Invalid Equipment ID format", 400));
    }

    const records = await PMS007.find({ equipmentId })
        .populate("equipmentId")
        .populate("laboratoryId")
        .populate("performedBy", "FirstName Middle LastName username role")
        .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
        status: "success",
        totalRecords: records.length,
        data: records,
    });
});

// ============================================================
// UPDATE
// ============================================================
export const updatePMS007 = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    const ALLOWED_FIELDS = [
        "equipmentId",
        "laboratoryId",
        "codeNo",
        "instrumentName",
        "instrumentType",
        "accuracy",
        "errorObserved",
        "errorCorrected",
        "calibratedBy",
        "date",
        "remarks",
        "performedByFullName",
    ];

    const filteredBody = {};
    ALLOWED_FIELDS.forEach((key) => {
        const value = req.body[key];
        if (value !== "" && value !== null && value !== undefined) {
            filteredBody[key] = value;
        }
    });

    if (filteredBody.equipmentId) {
        if (!mongoose.Types.ObjectId.isValid(filteredBody.equipmentId)) {
            return next(new CustomError("Invalid Equipment ID format", 400));
        }
        const exists = await Equipment.findById(filteredBody.equipmentId);
        if (!exists) return next(new CustomError("Equipment not found", 404));
    }

    if (filteredBody.laboratoryId) {
        if (!mongoose.Types.ObjectId.isValid(filteredBody.laboratoryId)) {
            return next(new CustomError("Invalid Laboratory ID format", 400));
        }
        const exists = await Laboratory.findById(filteredBody.laboratoryId);
        if (!exists) return next(new CustomError("Laboratory not found", 404));
    }

    if (filteredBody.date) {
        if (isNaN(new Date(filteredBody.date).getTime())) {
            return next(new CustomError("Invalid date format", 400));
        }
    }

    const updated = await PMS007.findByIdAndUpdate(
        req.params.id,
        filteredBody,
        { new: true, runValidators: true }
    )
        .populate("equipmentId")
        .populate("laboratoryId")
        .populate("performedBy", "FirstName Middle LastName username role");

    if (!updated) {
        return next(new CustomError("PMS007 record not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: updated,
    });
});

// ============================================================
// DELETE
// ============================================================
export const deletePMS007 = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    const deleted = await PMS007.findByIdAndDelete(req.params.id);

    if (!deleted) {
        return next(new CustomError("PMS007 record not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: null,
    });
});

// ============================================================
// DISPLAY ALL PMS007 — Lahat ng records
// ============================================================
export const DisplayAllPMS007 = AsyncErrorHandler(async (req, res) => {
    try {
        // ============================================================
        // 1️⃣ Kunin lahat ng Laboratory + i-populate ang Encharge (User)
        // ============================================================
        const laboratory = await Laboratory.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "Encharge",
                    foreignField: "_id",
                    as: "Encharge",
                },
            },
            {
                $unwind: {
                    path: "$Encharge",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    _id: 1,
                    LaboratoryName: { $ifNull: ["$LaboratoryName", "N/A"] },
                    performedBy: {
                        _id: "$Encharge._id",
                        username: { $ifNull: ["$Encharge.username", ""] },
                        FirstName: { $ifNull: ["$Encharge.FirstName", ""] },
                        Middle: { $ifNull: ["$Encharge.Middle", ""] },
                        LastName: { $ifNull: ["$Encharge.LastName", ""] },
                        role: { $ifNull: ["$Encharge.role", ""] },
                    },
                },
            },
            { $limit: 1 },
        ]);

        if (!laboratory || laboratory.length === 0) {
            return res.status(404).json({
                status: "fail",
                message: "No laboratory found.",
            });
        }

        const performedBy = laboratory[0].performedBy || null;

        // ============================================================
        // 2️⃣ Query flags (optional date filter)
        // ============================================================
        const { from, to } = req.query;

        // ============================================================
        // 3️⃣ Buuin ang date filter (kung may from/to)
        // ============================================================
        const dateFilter = {};

        if (from || to) {
            dateFilter.date = {}; // ✅ gamit ang `date` field ng PMS007

            if (from) {
                const fromDate = new Date(from);
                if (isNaN(fromDate.getTime())) {
                    return res.status(400).json({
                        status: "fail",
                        message: "Invalid 'from' date format. Use YYYY-MM-DD.",
                    });
                }
                fromDate.setHours(0, 0, 0, 0);
                dateFilter.date.$gte = fromDate;
            }

            if (to) {
                const toDate = new Date(to);
                if (isNaN(toDate.getTime())) {
                    return res.status(400).json({
                        status: "fail",
                        message: "Invalid 'to' date format. Use YYYY-MM-DD.",
                    });
                }
                toDate.setHours(23, 59, 59, 999);
                dateFilter.date.$lte = toDate;
            }
        }

        // ============================================================
        // 4️⃣ Kunin LAHAT ng PMS007 records
        //    - Kapag may from/to → filtered by date
        //    - Kapag wala → lahat ng records
        // ============================================================
        const pmsRecord = await PMS007.find({
            ...dateFilter,
        })
            .populate("equipmentId")
            .sort({ date: -1, createdAt: -1 }); // ✅ sort by `date`

        // ============================================================
        // 5️⃣ Response
        // ============================================================
        res.status(200).json({
            status: "success",
            pmsRecord,
            data: {
                _id: laboratory[0]._id,
                LaboratoryName: laboratory[0].LaboratoryName,
                performedBy,
            },
        });
    } catch (error) {
        console.error("❌ DisplayAllPMS007 error:", error);

        if (!res.headersSent) {
            return res.status(500).json({
                status: "fail",
                message:
                    error?.message ||
                    "An error occurred while fetching PMS007 records.",
            });
        }
    }
});