import AsyncErrorHandler from "../Utils/AsyncErrorHandler.js";
import mongoose from "mongoose";
import CustomError from "../Utils/CustomError.js";
import PMS006 from "../Models/PMS006.js";
import Equipment from "../Models/Equipment.js";
import Laboratory from "../Models/Laboratory.js";

const validateObjectId = (id, fieldName) => {
    if (!id) throw new CustomError(`${fieldName} is required`, 400);
    if (!mongoose.Types.ObjectId.isValid(id))
        throw new CustomError(`Invalid ${fieldName} format`, 400);
};

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
        dateFilter.maintenanceDate = {};

        if (from) {
            const fromDate = new Date(from);
            if (isNaN(fromDate.getTime())) {
                return res.status(400).json({
                    status: "fail",
                    message: "Invalid 'from' date format. Use YYYY-MM-DD.",
                });
            }
            fromDate.setHours(0, 0, 0, 0);
            dateFilter.maintenanceDate.$gte = fromDate;
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
            dateFilter.maintenanceDate.$lte = toDate;
        }
    }

    const pmsRecord = await PMS006.find({
        laboratoryId,
        ...dateFilter,
    })
        .populate("equipmentId")
        .populate("performedBy", "FirstName Middle LastName username role")
        .sort({ maintenanceDate: -1, createdAt: -1 });

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

export const createPMS006 = AsyncErrorHandler(async (req, res, next) => {
    try {
        const {
            equipmentId,
            laboratoryId,
            pms001Id,
            analysisTrouble,
            adjustmentSetting,
            manHourUse,
            counterMeasures,
            improvementRepairProcedure,
            sparePartsMaterialsUsed,
            incharge,
            maintenanceDate,
            performedByFullName,
        } = req.body;

        if (process.env.NODE_ENV !== "production") {
            console.log("🔍 req.body keys:", Object.keys(req.body || {}));
            console.log("pms001Id:", pms001Id);
        }

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
        // VALIDATE equipmentId
        // ------------------------------------------------------
        validateObjectId(equipmentId, "Equipment ID");

        const equipmentExists = await Equipment.findById(equipmentId);
        if (!equipmentExists) {
            return next(new CustomError("Equipment not found", 404));
        }

        // ------------------------------------------------------
        // VALIDATE laboratoryId
        // ------------------------------------------------------
        validateObjectId(laboratoryId, "Laboratory ID");

        const laboratoryExists = await Laboratory.findById(laboratoryId);
        if (!laboratoryExists) {
            return next(new CustomError("Laboratory not found", 404));
        }

        // ------------------------------------------------------
        // REMOVE Remarks/remarks (case-insensitive)
        // ------------------------------------------------------
        const bodyWithoutRemarks = Object.fromEntries(
            Object.entries(req.body).filter(
                ([key]) => key.toLowerCase() !== "remarks"
            )
        );

        // ------------------------------------------------------
        // NORMALIZE fields
        // ------------------------------------------------------
        const normalizedBody = { ...bodyWithoutRemarks };

        // Siguraduhing kasama ang required fields
        normalizedBody.pms001Id = pms001Id;
        normalizedBody.equipmentId = equipmentId;
        normalizedBody.laboratoryId = laboratoryId;

        // String fields — trim (default to "" kung wala)
        const stringFields = [
            "analysisTrouble",
            "adjustmentSetting",
            "counterMeasures",
            "improvementRepairProcedure",
            "sparePartsMaterialsUsed",
            "incharge",
            "performedByFullName",
        ];
        for (const field of stringFields) {
            if (normalizedBody[field] !== undefined && normalizedBody[field] !== null) {
                normalizedBody[field] = String(normalizedBody[field]).trim();
            }
        }

        // Man_hour_used — numeric guard (supports both camelCase & legacy)
        const manHourRaw =
            normalizedBody.manHourUse !== undefined
                ? normalizedBody.manHourUse
                : normalizedBody.Man_hour_used;
        if (manHourRaw !== undefined) {
            if (manHourRaw === "" || manHourRaw === null) {
                normalizedBody.manHourUse = "";
            } else {
                const num = Number(manHourRaw);
                if (Number.isNaN(num)) {
                    return next(
                        new CustomError("Man_hour_used must be a number", 400)
                    );
                }
                normalizedBody.manHourUse = num;
            }
        }

        // maintenanceDate — normalize to Date
        if (normalizedBody.maintenanceDate) {
            const d = new Date(normalizedBody.maintenanceDate);
            if (Number.isNaN(d.getTime())) {
                return next(new CustomError("Invalid maintenance date format", 400));
            }
            normalizedBody.maintenanceDate = d;
        } else {
            normalizedBody.maintenanceDate = new Date();
        }

        // performedBy — galing sa auth user, hindi sa body
        normalizedBody.performedBy = req.user?._id || null;

        if (process.env.NODE_ENV !== "production") {
            console.log("normalizedBody:", normalizedBody);
        }

        // ------------------------------------------------------
        // UPSERT — atomic (findOneAndUpdate with upsert)
        // ------------------------------------------------------
        const existing = await PMS006.findOne({ pms001Id })
            .select("_id")
            .lean();

        const record = await PMS006.findOneAndUpdate(
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
            return next(new CustomError("Failed to save PMS006 record", 400));
        }

        const isUpdate = Boolean(existing);
        if (process.env.NODE_ENV !== "production") {
            console.log(
                isUpdate ? "Updated existing PMS006 record:" : "Created new PMS006 record:",
                record._id
            );
        }

        // Populate
        const populated = await record.populate([
            { path: "equipmentId" },
            { path: "laboratoryId" },
            {
                path: "performedBy",
                select: "FirstName Middle LastName username role",
            },
        ]);

        res.status(isUpdate ? 200 : 201).json({
            status: "success",
            message: isUpdate
                ? "PMS006 record updated successfully"
                : "PMS006 record created successfully",
            data: populated,
        });
    } catch (err) {
        console.error("createPMS006 error:", {
            name: err.name,
            message: err.message,
            code: err.code,
            errors: err.errors,
        });

        if (err.name === "ValidationError") {
            const messages = Object.values(err.errors).map((e) => e.message);
            return next(
                new CustomError(`Validation failed: ${messages.join(", ")}`, 400)
            );
        }

        if (err.name === "CastError") {
            return next(
                new CustomError(`Invalid ${err.path}: ${err.value}`, 400)
            );
        }

        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern || {})[0] || "field";
            return next(new CustomError(`Duplicate value for ${field}`, 409));
        }

        return next(
            new CustomError(
                err?.message || "Failed to create PMS006 record",
                500
            )
        );
    }
});

export const getAllPMS006 = AsyncErrorHandler(async (req, res, next) => {
    const records = await PMS006.find()
        .populate("equipmentId")
        .populate("laboratoryId")
        .populate("performedBy", "FirstName Middle LastName username role")
        .sort({ maintenanceDate: -1, createdAt: -1 });

    res.status(200).json({
        status: "success",
        totalRecords: records.length,
        data: records,
    });
});

export const getPMS006ById = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    const record = await PMS006.findById(req.params.id)
        .populate("equipmentId")
        .populate("laboratoryId")
        .populate("performedBy", "FirstName Middle LastName username role");

    if (!record) {
        return next(new CustomError("PMS006 record not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: record,
    });
});


export const getPMS006ByEquipmentId = AsyncErrorHandler(async (req, res, next) => {
    const { equipmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
        return next(new CustomError("Invalid Equipment ID format", 400));
    }

    const records = await PMS006.find({ equipmentId })
        .populate("equipmentId")
        .populate("laboratoryId")
        .populate("performedBy", "FirstName Middle LastName username role")
        .sort({ maintenanceDate: -1, createdAt: -1 });

    res.status(200).json({
        status: "success",
        totalRecords: records.length,
        data: records,
    });
});


export const updatePMS006 = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    const ALLOWED_FIELDS = [
        "equipmentId",
        "laboratoryId",
        "analysisTrouble",
        "adjustmentSetting",
        "manHourUse",
        "counterMeasures",
        "improvementRepairProcedure",
        "sparePartsMaterialsUsed",
        "incharge",
        "maintenanceDate",
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

    if (filteredBody.maintenanceDate) {
        if (isNaN(new Date(filteredBody.maintenanceDate).getTime())) {
            return next(new CustomError("Invalid maintenance date format", 400));
        }
    }

    const updated = await PMS006.findByIdAndUpdate(
        req.params.id,
        filteredBody,
        { new: true, runValidators: true }
    )
        .populate("equipmentId")
        .populate("laboratoryId")
        .populate("performedBy", "FirstName Middle LastName username role");

    if (!updated) {
        return next(new CustomError("PMS006 record not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: updated,
    });
});


export const deletePMS006 = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    const deleted = await PMS006.findByIdAndDelete(req.params.id);

    if (!deleted) {
        return next(new CustomError("PMS006 record not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: null,
    });
});

export const DisplayAllPMS006 = AsyncErrorHandler(async (req, res) => {
    try {
        const userID = req.user._id;
        const role = req.user.role;

        console.log("triggerrr____ DisplayAllPMS006");

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
                    from: "users", // collection name (lowercase + pluralized)
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
        // STEP 5: Buuin ang date filter (base sa `createdAt`)
        // ============================================================
        const dateFilter = {};

        if (from || to) {
            dateFilter.createdAt = {};

            if (from) {
                const fromDate = new Date(from);
                if (isNaN(fromDate.getTime())) {
                    return res.status(400).json({
                        status: "fail",
                        message: "Invalid 'from' date format. Use YYYY-MM-DD.",
                    });
                }
                fromDate.setHours(0, 0, 0, 0);
                dateFilter.createdAt.$gte = fromDate;
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
                dateFilter.createdAt.$lte = toDate;
            }
        }

        // ============================================================
        // STEP 6: Matching — PMS006 records lang ng lab
        // ============================================================
        const pms006Query = { ...dateFilter };

        if (laboratoryId) {
            // ⚠️ Kung may `laboratoryId` field ang PMS006, direct match:
            pms006Query.laboratoryId = laboratoryId;

            // ⚠️ KUNG WALANG `laboratoryId` sa PMS006, gamitin ang equipment approach:
            // const equipmentList = await Equipment.find(
            //     { laboratory: laboratoryId },
            //     { _id: 1 }
            // ).lean();
            // const equipmentIds = equipmentList.map((e) => e._id);
            // if (equipmentIds.length > 0) {
            //     pms006Query.equipmentId = { $in: equipmentIds };
            // } else {
            //     pms006Query._id = { $in: [] };
            // }
        }

        // ============================================================
        // STEP 7: Kunin ang PMS006 records — matching + date filter
        // ============================================================
        const pmsRecord = await PMS006.find(pms006Query)
            .populate("equipmentId")
            .sort({ createdAt: -1 });

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
        console.error("❌ DisplayAllPMS006 error:", error);

        if (!res.headersSent) {
            return res.status(500).json({
                status: "fail",
                message:
                    error?.message ||
                    "An error occurred while fetching PMS006 records.",
            });
        }
    }
});