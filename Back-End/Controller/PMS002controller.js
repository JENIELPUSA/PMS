// src/Controllers/PMS002Controller.js
const AsyncErrorHandler = require("../Utils/AsyncErrorHandler");
const mongoose = require("mongoose");
const CustomError = require("../Utils/CustomError");
const PMS002 = require("../Models/PMS002");
const Equipment = require("../Models/Equipment");
const Laboratory = require("../Models/Laboratory");
const PMS001 = require("../Models/PMS001");

// ============================================================
// HELPER — Extract pms002 fields (kasama ang pmsNo)
// ✅ routineInspection = Boolean na
// ============================================================
const extractPMS002 = (pms002Record) => {
    if (!pms002Record) return null;

    return {
        _id: pms002Record._id,
        pmsNo: pms002Record.pmsNo || 0,

        // ✅ 8 boolean fields
        routineInspection: pms002Record.routineInspection ?? false,
        lubrication: pms002Record.lubrication ?? false,
        overhauling: pms002Record.overhauling ?? false,
        minorAdjustment: pms002Record.minorAdjustment ?? false,
        replaceWornOutParts: pms002Record.replaceWornOutParts ?? false,
        repair: pms002Record.repair ?? false,
        generalRecondition: pms002Record.generalRecondition ?? false,
        repairPart: pms002Record.repairPart ?? false,

        remarks: pms002Record.remarks || "",
        createdAt: pms002Record.createdAt,
    };
};

// ============================================================
// HELPER — Build date filter (from / to)
// ============================================================
const buildDateFilter = (from, to) => {
    const dateFilter = {};

    if (from || to) {
        dateFilter.createdAt = {};

        if (from) {
            const fromDate = new Date(from);
            if (isNaN(fromDate.getTime())) {
                return { error: "Invalid 'from' date format. Use YYYY-MM-DD." };
            }
            fromDate.setHours(0, 0, 0, 0);
            dateFilter.createdAt.$gte = fromDate;
        }

        if (to) {
            const toDate = new Date(to);
            if (isNaN(toDate.getTime())) {
                return { error: "Invalid 'to' date format. Use YYYY-MM-DD." };
            }
            toDate.setHours(23, 59, 59, 999);
            dateFilter.createdAt.$lte = toDate;
        }
    }

    return { dateFilter };
};

// ============================================================
// HELPER — Normalize 8 boolean fields
// Handles: true, false, "D", "", 1, 0
// ============================================================
const BOOLEAN_FIELDS = [
    "routineInspection",
    "lubrication",
    "overhauling",
    "minorAdjustment",
    "replaceWornOutParts",
    "repair",
    "generalRecondition",
    "repairPart",
];

const normalizeBooleans = (body) => {
    const normalized = { ...body };

    BOOLEAN_FIELDS.forEach((field) => {
        if (field in body) {
            normalized[field] = Boolean(body[field]);
        }
    });

    return normalized;
};


exports.FindByEquipment = AsyncErrorHandler(async (req, res) => {
    try {
        // 1️⃣ User → Laboratory
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

        // 2️⃣ Query flags
        const { from, to, all } = req.query;
        const showAll = all === "true" || all === "1";

        if (!showAll && !from && !to) {
            return res.status(200).json({
                status: "success",
                pmsRecord: [],
                totalPMS002: 0,
                totalPMS001: 0,
                totalMergedRecords: 0,
                data: {
                    _id: laboratoryId,
                    LaboratoryName: laboratory[0].LaboratoryName,
                    performedBy,
                },
            });
        }

        // 3️⃣ Date filter
        const { dateFilter, error: dateError } = buildDateFilter(
            showAll ? null : from,
            showAll ? null : to
        );

        if (dateError) {
            return res.status(400).json({
                status: "fail",
                message: dateError,
            });
        }

        // 4️⃣ PMS002 records — LAHAT
        const pmsRecords = await PMS002.find({
            laboratoryId,
            ...dateFilter,
        })
            .populate(
                "equipmentId",
                "code Brand DateAcquired SerialNumber Specification status remarks Category"
            )
            .sort({ createdAt: -1 })
            .lean();

        // 5️⃣ PMS001 records — para sa equipment metadata
        const pms001Records = await PMS001.find({
            laboratoryId,
            ...(showAll ? {} : dateFilter),
        })
            .populate(
                "equipmentId",
                "code Brand DateAcquired Specification"
            )
            .sort({ createdAt: -1 })
            .lean();

        console.log("🔍 PMS002 count:", pmsRecords.length);
        console.log("🔍 PMS001 count:", pms001Records.length);

        // 6️⃣ Map PMS001 by equipmentId
        const pms001ByEquipment = new Map();
        pms001Records.forEach((p1) => {
            if (!p1.equipmentId) return;
            const eqId = p1.equipmentId._id
                ? p1.equipmentId._id.toString()
                : p1.equipmentId.toString();
            if (!pms001ByEquipment.has(eqId)) {
                pms001ByEquipment.set(eqId, p1);
            }
        });

        // ============================================================
        // ✅ 7️⃣ BUILD MERGED — ISANG ROW PER PMS002 RECORD
        // WALANG GROUP BY EQUIPMENT — bawat PMS002 = sariling row
        // ============================================================
        const merged = pmsRecords.map((pms002Record) => {
            const eq = pms002Record.equipmentId || {};

            const eqId = eq._id
                ? eq._id.toString()
                : pms002Record.equipmentId?.toString() || null;

            const matchingPMS001 = eqId
                ? pms001ByEquipment.get(eqId)
                : null;

            return {
                // ✅ Unique PMS002 ID — ito ang gagamitin sa frontend
                pms002Id: pms002Record._id,
                pmsNo: pms002Record.pmsNo || 0,

                // Equipment info
                equipment: eq._id
                    ? {
                          _id: eq._id,
                          code: eq.code || "N/A",
                          Brand: eq.Brand || "N/A",
                          DateAcquired: eq.DateAcquired || null,
                          SerialNumber: eq.SerialNumber || "N/A",
                          Specification: eq.Specification || "N/A",
                          status: eq.status || "N/A",
                          remarks: eq.remarks || "",
                          Category: eq.Category || null,
                      }
                    : null,

                // PMS001 info (kung may match)
                pms001: matchingPMS001
                    ? {
                          _id: matchingPMS001._id,
                          code:
                              matchingPMS001.equipmentId?.code || "N/A",
                          equipmentName: matchingPMS001.equipmentId
                              ? `${
                                    matchingPMS001.equipmentId.Brand ||
                                    ""
                                } ${
                                    matchingPMS001.equipmentId
                                        .Specification || ""
                                }`.trim() || "N/A"
                              : "N/A",
                          DateAcquired:
                              matchingPMS001.equipmentId?.DateAcquired ||
                              null,
                          serviceable:
                              matchingPMS001.serviceable ?? false,
                          nonServiceable:
                              matchingPMS001.nonServiceable ?? false,
                          type: matchingPMS001.type || "N/A",
                          breakdownNo:
                              matchingPMS001.breakdownNo || "0",
                          breakdownDuration:
                              matchingPMS001.breakdownDuration || "N/A",
                          availYes: matchingPMS001.availYes ?? false,
                          availNo: matchingPMS001.availNo ?? false,
                          remarks: matchingPMS001.remarks || "",
                          createdAt: matchingPMS001.createdAt,
                      }
                    : null,

                // ✅ PMS002 fields — DIRECT
                pms002: {
                    _id: pms002Record._id,
                    pmsNo: pms002Record.pmsNo || 0,
                    routineInspection:
                        pms002Record.routineInspection ?? false,
                    lubrication: pms002Record.lubrication ?? false,
                    overhauling: pms002Record.overhauling ?? false,
                    minorAdjustment:
                        pms002Record.minorAdjustment ?? false,
                    replaceWornOutParts:
                        pms002Record.replaceWornOutParts ?? false,
                    repair: pms002Record.repair ?? false,
                    generalRecondition:
                        pms002Record.generalRecondition ?? false,
                    repairPart: pms002Record.repairPart ?? false,
                    remarks: pms002Record.remarks || "",
                    createdAt: pms002Record.createdAt,
                },

                hasPMS001: !!matchingPMS001,
                hasPMS002: true,
                pms002Count: 1,
                latestActivityAt: pms002Record.createdAt,
            };
        });

        // 8️⃣ Sort by createdAt desc
        merged.sort((a, b) => {
            const aDate = a.pms002?.createdAt || 0;
            const bDate = b.pms002?.createdAt || 0;
            return new Date(bDate) - new Date(aDate);
        });

        console.log("🔍 merged.length:", merged.length);

        // 9️⃣ Response
        return res.status(200).json({
            status: "success",
            pmsRecord: merged,
            totalPMS002: pmsRecords.length,
            totalPMS001: pms001Records.length,
            totalMergedRecords: merged.length,
            data: {
                _id: laboratoryId,
                LaboratoryName: laboratory[0].LaboratoryName,
                performedBy,
            },
        });
    } catch (err) {
        console.error("💥 FindByEquipment CRASHED");
        console.error("Message:", err.message);
        console.error("Name:", err.name);
        console.error("Stack:", err.stack);

        return res.status(500).json({
            status: "fail",
            message: "Internal server error",
            error: {
                name: err.name,
                message: err.message,
            },
        });
    }
});


exports.createPMS002 = AsyncErrorHandler(async (req, res, next) => {
    const { equipmentId, laboratoryId } = req.body;

    console.log("BODY", req.body);

    // Validate equipmentId
    if (!equipmentId) {
        return next(new CustomError("Equipment ID is required", 400));
    }

    if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
        return next(new CustomError("Invalid Equipment ID format", 400));
    }

    const equipmentExists = await Equipment.findById(equipmentId);
    if (!equipmentExists) {
        return next(new CustomError("Equipment not found", 404));
    }

    // Validate laboratoryId (optional — kung provided)
    if (laboratoryId) {
        if (!mongoose.Types.ObjectId.isValid(laboratoryId)) {
            return next(
                new CustomError("Invalid Laboratory ID format", 400)
            );
        }

        const laboratoryExists = await Laboratory.findById(laboratoryId);
        if (!laboratoryExists) {
            return next(new CustomError("Laboratory not found", 404));
        }
    }

    // ✅ Normalize booleans bago i-save
    const normalizedBody = normalizeBooleans(req.body);

    // pmsNo ay auto-generated sa pre("save") hook
    const newRecord = await PMS002.create(normalizedBody);

    if (!newRecord) {
        return next(new CustomError("Failed to create PMS record", 400));
    }

    const populated = await newRecord.populate("equipmentId");

    res.status(201).json({
        status: "success",
        data: populated,
    });
});

// ============================================================
// GET ALL PMS002 — with Encharge matching
// ============================================================
exports.getAllPMS002 = AsyncErrorHandler(async (req, res, next) => {
    try {
        const userID = req.user._id;
        const role = req.user.role;

        console.log("triggerrr____ getAllPMS002");

        // STEP 1: Base match stage
        let matchStage = {};

        // STEP 2: Kung role === "User", i-filter base sa Laboratory ng Encharge
        if (role === "User") {
            const laboratory = await Laboratory.findOne({ Encharge: userID });

            console.log("laboratory", laboratory);

            if (!laboratory) {
                return res.status(404).json({
                    status: "fail",
                    message:
                        "You are not assigned as Encharge to any laboratory.",
                });
            }

            matchStage._id = laboratory._id;
        }

        // STEP 3: Kunin ang Laboratory gamit ang matchStage
        const laboratory = await Laboratory.aggregate([
            { $match: matchStage },
            {
                $project: {
                    _id: 1,
                    LaboratoryName: { $ifNull: ["$LaboratoryName", "N/A"] },
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

        // STEP 4: Matching — PMS002 records lang ng lab
        const pms002Query = {};

        if (laboratoryId) {
            pms002Query.laboratoryId = laboratoryId;
        }

        const records = await PMS002.find(pms002Query)
            .populate("equipmentId")
            .sort({ pmsNo: -1, createdAt: -1 })
            .lean();

        console.log("🔍 PMS002 count:", records.length);

        // STEP 5: Response
        res.status(200).json({
            status: "success",
            role: role,
            totalRecords: records.length,
            data: records.map((rec) => ({
                ...rec,
                pmsNo: rec.pmsNo || 0,
                routineInspection: rec.routineInspection ?? false,
            })),
            laboratory: {
                _id: laboratory[0]._id,
                LaboratoryName: laboratory[0].LaboratoryName,
            },
        });
    } catch (err) {
        console.error("💥 getAllPMS002 CRASHED");
        console.error("Message:", err.message);
        console.error("Name:", err.name);
        console.error("Stack:", err.stack);

        return res.status(500).json({
            status: "fail",
            message: "Internal server error",
            error: {
                name: err.name,
                message: err.message,
            },
        });
    }
});

// ============================================================
// GET BY ID — Single PMS002 record
// ============================================================
exports.getPMS002ById = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    const record = await PMS002.findById(req.params.id).populate(
        "equipmentId"
    );

    if (!record) {
        return next(new CustomError("PMS record not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            ...record.toObject(),
            pmsNo: record.pmsNo || 0,
            routineInspection: record.routineInspection ?? false,
        },
    });
});

// ============================================================
// GET BY EQUIPMENT ID — Lahat ng PMS history ng isang equipment
// ============================================================
exports.getPMS002ByEquipmentId = AsyncErrorHandler(
    async (req, res, next) => {
        const { equipmentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
            return next(
                new CustomError("Invalid Equipment ID format", 400)
            );
        }

        const records = await PMS002.find({ equipmentId })
            .populate("equipmentId")
            .populate("laboratoryId")
            .sort({ pmsNo: -1 })
            .lean();

        res.status(200).json({
            status: "success",
            totalRecords: records.length,
            data: records.map((rec) => ({
                ...rec,
                pmsNo: rec.pmsNo || 0,
                routineInspection: rec.routineInspection ?? false,
            })),
        });
    }
);

// ============================================================
// UPDATE — Update existing PMS002 record
// ✅ Normalize booleans (routineInspection included)
// ✅ Keep `false` values (huwag i-filter)
// ============================================================
exports.updatePMS002 = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    // Iwasan ma-update ang pmsNo
    // ✅ BOOLEAN fields — keep false values (huwag i-filter)
    // ✅ String fields — filter empty values
    const filteredBody = {};
    Object.keys(req.body).forEach((key) => {
        if (key === "pmsNo") return;

        const value = req.body[key];

        // ✅ Boolean fields — always include (kahit false)
        if (BOOLEAN_FIELDS.includes(key)) {
            filteredBody[key] = Boolean(value);
            return;
        }

        // String fields — filter empty values
        if (value !== "" && value !== null && value !== undefined) {
            filteredBody[key] = value;
        }
    });

    // Validate equipmentId kung binago
    if (
        filteredBody.equipmentId &&
        !mongoose.Types.ObjectId.isValid(filteredBody.equipmentId)
    ) {
        return next(
            new CustomError("Invalid Equipment ID format", 400)
        );
    }

    // Validate laboratoryId kung binago
    if (
        filteredBody.laboratoryId &&
        !mongoose.Types.ObjectId.isValid(filteredBody.laboratoryId)
    ) {
        return next(
            new CustomError("Invalid Laboratory ID format", 400)
        );
    }

    const updated = await PMS002.findByIdAndUpdate(
        req.params.id,
        filteredBody,
        {
            new: true,
            runValidators: true,
        }
    )
        .populate("equipmentId")
        .populate("laboratoryId");

    if (!updated) {
        return next(new CustomError("PMS record not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            ...updated.toObject(),
            pmsNo: updated.pmsNo || 0,
            routineInspection: updated.routineInspection ?? false,
        },
    });
});

// ============================================================
// DELETE — Remove PMS002 record
// ============================================================
exports.deletePMS002 = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    const deleted = await PMS002.findByIdAndDelete(req.params.id);

    if (!deleted) {
        return next(new CustomError("PMS record not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: null,
    });
});

// ============================================================
// DISPLAY ALL PMS002 — PMS002 records lang (walang merge)
// ============================================================
exports.DisplayAllPMS002 = AsyncErrorHandler(async (req, res) => {
    try {
        const userID = req.user._id;
        const role = req.user.role;

        // STEP 1: Base match stage
        let matchStage = {};

        // STEP 2: Kung role === "User", i-filter base sa Laboratory ng Encharge
        if (role === "User") {
            const laboratory = await Laboratory.findOne({ Encharge: userID });

            console.log("laboratory", laboratory);

            if (!laboratory) {
                return res.status(404).json({
                    status: "fail",
                    message:
                        "You are not assigned as Encharge to any laboratory.",
                });
            }

            matchStage._id = laboratory._id;
        }

        // STEP 3: Kunin ang Laboratory + populate Encharge
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

        // STEP 4: Date filter
        const { from, to } = req.query;
        const { dateFilter, error: dateError } = buildDateFilter(
            from,
            to
        );

        if (dateError) {
            return res.status(400).json({
                status: "fail",
                message: dateError,
            });
        }

        // STEP 5: Matching — PMS002 records lang ng lab
        const pms002Query = { ...dateFilter };

        if (laboratoryId) {
            pms002Query.laboratoryId = laboratoryId;
        }

        const pmsRecords = await PMS002.find(pms002Query)
            .populate(
                "equipmentId",
                "code Brand DateAcquired SerialNumber Specification status remarks Category"
            )
            .sort({ pmsNo: -1, createdAt: -1 })
            .lean();

        console.log("🔍 PMS002 count:", pmsRecords);

        // STEP 6: Response
        return res.status(200).json({
            status: "success",
            role: role,
            pmsRecord002: pmsRecords.map((rec) => ({
                ...rec,
                routineInspection: rec.routineInspection ?? false,
            })),
            totalPMS002: pmsRecords.length,
            data: {
                _id: laboratoryId,
                LaboratoryName: laboratory[0].LaboratoryName,
                performedBy,
            },
        });
    } catch (err) {
        console.error("💥 DisplayAllPMS002 CRASHED");
        console.error("Message:", err.message);
        console.error("Name:", err.name);
        console.error("Stack:", err.stack);

        return res.status(500).json({
            status: "fail",
            message: "Internal server error",
            error: {
                name: err.name,
                message: err.message,
            },
        });
    }
});