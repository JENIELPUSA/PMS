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



export const createPMS007 = AsyncErrorHandler(async (req, res, next) => {
    try {

        const {
            equipmentId,
            laboratoryId,
            codeNo,
            pms001Id,
            instrumentName,
            instrumentType,
            accuracy,
            errorObserved,
            errorCorrected,
            calibratedBy,
            date,
            remarks,
        } = req.body;

        // ------------------------------------------------------
        // VALIDATE pms001Id
        // ------------------------------------------------------
        if (!pms001Id) {
            return next(new CustomError("PMS001 ID is required", 400));
        }

        if (!mongoose.Types.ObjectId.isValid(pms001Id)) {
            return next(new CustomError("Invalid PMS001 ID format", 400));
        }

        // ------------------------------------------------------
        // VALIDATE laboratoryId
        // ------------------------------------------------------
        const labError = validateObjectId(laboratoryId, "Laboratory ID");
        if (labError) return next(labError);

        const laboratoryExists = await Laboratory.findById(laboratoryId);

        if (!laboratoryExists) {
            return next(new CustomError("Laboratory not found", 404));
        }

        // ------------------------------------------------------
        // VALIDATE equipmentId (OPTIONAL)
        // ------------------------------------------------------
        if (equipmentId !== undefined && equipmentId !== null && equipmentId !== "") {
            const eqError = validateObjectId(equipmentId, "Equipment ID");
            if (eqError) return next(eqError);

            const equipmentExists = await Equipment.findById(equipmentId);

            if (!equipmentExists) {
                return next(new CustomError("Equipment not found", 404));
            }
        }

        // ------------------------------------------------------
        // NORMALIZE STRING FIELDS
        // ------------------------------------------------------
        const trimOrEmpty = (v) =>
            v === undefined || v === null ? "" : String(v).trim();

        // ------------------------------------------------------
        // NORMALIZE DATE
        // ------------------------------------------------------
        let normalizedDate;

        if (date !== undefined && date !== null && date !== "") {
            const d = new Date(date);

            if (Number.isNaN(d.getTime())) {
                return next(new CustomError("Invalid date format", 400));
            }

            normalizedDate = d;
        } else {
            normalizedDate = new Date();
        }

        // ------------------------------------------------------
        // NORMALIZE BODY — WHITELIST
        // ------------------------------------------------------
        const normalizedBody = {
            pms001Id,
            equipmentId: equipmentId || null,
            laboratoryId,

            codeNo: trimOrEmpty(codeNo),
            instrumentName: trimOrEmpty(instrumentName),
            instrumentType: trimOrEmpty(instrumentType),
            accuracy: trimOrEmpty(accuracy),
            errorObserved: trimOrEmpty(errorObserved),
            errorCorrected: trimOrEmpty(errorCorrected),
            calibratedBy: trimOrEmpty(calibratedBy),

            date: normalizedDate,
            remarks: trimOrEmpty(remarks),

            performedByFullName: [
                req.user.FirstName,
                req.user.Middle,
                req.user.LastName,
            ]
                .filter(Boolean)
                .join(" ")
                .trim(),

            performedBy: req.user._id,
        };

        if (process.env.NODE_ENV !== "production") {
            console.log("normalizedBody:", normalizedBody);
        }

        // ------------------------------------------------------
        // UPSERT — FIND EXISTING RECORD
        // ------------------------------------------------------
        const existing = await PMS007.findOne({ pms001Id })
            .select("_id")
            .lean();

        // ------------------------------------------------------
        // UPSERT — CREATE OR UPDATE
        // ------------------------------------------------------
        const record = await PMS007.findOneAndUpdate(
            { pms001Id },
            { $set: normalizedBody },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true,
            }
        );

        if (!record) {
            return next(
                new CustomError("Failed to save PMS007 record", 400)
            );
        }

        const isUpdate = Boolean(existing);

        if (process.env.NODE_ENV !== "production") {
            console.log(
                isUpdate
                    ? "Updated existing PMS007 record:"
                    : "Created new PMS007 record:",
                record._id
            );
        }

        // ------------------------------------------------------
        // POPULATE
        // ------------------------------------------------------
        const populated = await record.populate([
            { path: "equipmentId" },
            { path: "laboratoryId" },
            {
                path: "performedBy",
                select: "FirstName Middle LastName username role",
            },
        ]);

        // ------------------------------------------------------
        // RESPONSE
        // ------------------------------------------------------
        res.status(isUpdate ? 200 : 201).json({
            status: "success",
            message: isUpdate
                ? "PMS007 record updated successfully"
                : "PMS007 record created successfully",
            data: populated,
        });

    } catch (err) {
        console.error("createPMS007 error:", {
            name: err.name,
            message: err.message,
            code: err.code,
            errors: err.errors,
        });

        if (err.name === "ValidationError") {
            const messages = Object.values(err.errors).map(
                (e) => e.message
            );

            return next(
                new CustomError(
                    `Validation failed: ${messages.join(", ")}`,
                    400
                )
            );
        }

        if (err.name === "CastError") {
            return next(
                new CustomError(`Invalid ${err.path}: ${err.value}`, 400)
            );
        }

        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern || {})[0] || "field";

            return next(
                new CustomError(`Duplicate value for ${field}`, 409)
            );
        }

        return next(
            new CustomError(
                err?.message || "Failed to create PMS007 record",
                500
            )
        );
    }
});





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
// DISPLAY ALL PMS007 — with Encharge matching + optional date filter
// ============================================================
export const DisplayAllPMS007 = AsyncErrorHandler(async (req, res) => {
    try {
        const userID = req.user._id;
        const role = req.user.role;

        console.log("triggerrr____ DisplayAllPMS007");

        // ============================================================
        // STEP 1: Base match stage
        // ============================================================
        let matchStage = {};

        // ============================================================
        // STEP 2: Kung role === "User", i-filter base sa Laboratory ng Encharge
        // ============================================================
        if (role === "User") {
            const laboratory = await Laboratory.findOne({ Encharge: userID });

            console.log("laboratory", laboratory);

            if (!laboratory) {
                return res.status(404).json({
                    status: "fail",
                    message: "You are not assigned as Encharge to any laboratory.",
                });
            }

            matchStage._id = laboratory._id;
        }

        // ============================================================
        // STEP 3: Kunin ang Laboratory gamit ang matchStage
        //         + populate ang Encharge sa pamamagitan ng $lookup
        // ============================================================
        const laboratory = await Laboratory.aggregate([
            { $match: matchStage },
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

        const laboratoryId = laboratory[0]._id;
        const performedBy = laboratory[0].performedBy || null;

        // ============================================================
        // STEP 4: Query flags (optional date filter)
        // ============================================================
        const { from, to } = req.query;

        // ============================================================
        // STEP 5: Buuin ang date filter (base sa `date` field)
        // ============================================================
        const dateFilter = {};

        if (from || to) {
            dateFilter.date = {};

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
        // STEP 6: Matching — PMS007 records lang ng lab
        // ============================================================
        const pms007Query = { ...dateFilter };

        if (laboratoryId) {
            // ⚠️ Kung may `laboratoryId` field ang PMS007, direct match:
            pms007Query.laboratoryId = laboratoryId;

            // ⚠️ KUNG WALANG `laboratoryId` sa PMS007, gamitin ang equipment approach:
            // const equipmentList = await Equipment.find(
            //     { laboratory: laboratoryId },
            //     { _id: 1 }
            // ).lean();
            // const equipmentIds = equipmentList.map((e) => e._id);
            // if (equipmentIds.length > 0) {
            //     pms007Query.equipmentId = { $in: equipmentIds };
            // } else {
            //     pms007Query._id = { $in: [] };
            // }
        }

        // ============================================================
        // STEP 7: Kunin ang PMS007 records — matching + date filter
        // ============================================================
        const pmsRecord = await PMS007.find(pms007Query)
            .populate("equipmentId")
            .sort({ date: -1, createdAt: -1 });

        // ============================================================
        // STEP 8: Response
        // ============================================================
        res.status(200).json({
            status: "success",
            role: role,
            pmsRecord,
            data: {
                _id: laboratoryId,
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