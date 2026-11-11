// src/Controllers/PMS005Controller.js
const AsyncErrorHandler = require("../Utils/AsyncErrorHandler");
const mongoose = require("mongoose");
const CustomError = require("../Utils/CustomError");
const PMSMaintenanceController = require("../Models/PMS005");
const Equipment = require("../Models/Equipment");
const Laboratory = require("../Models/Laboratory");

// ============================================================
// FindByEquipment
// ============================================================
exports.FindByEquipment = AsyncErrorHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
        return res.status(400).json({
            status: "fail",
            message: "User ID not found in request.",
        });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // ============================================================
    // 1️⃣ Hanapin ang Laboratory ng user + i-populate ang Encharge (User)
    // ============================================================
    const laboratory = await Laboratory.aggregate([
        {
            $match: { Encharge: userObjectId },
        },
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

                // Tugma sa User schema field names
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

    // ============================================================
    // 2️⃣ Query flags
    // ============================================================
    const { from, to, all } = req.query;

    const showAll = all === "true" || all === "1";

    // Kung walang from, walang to, at hindi 'all' → empty
    if (!showAll && !from && !to) {
        return res.status(200).json({
            status: "success",
            pmsRecord: [],
            data: {
                _id: laboratoryId,
                LaboratoryName: laboratory[0].LaboratoryName,
                performedBy, // isama ang performedBy
            },
        });
    }

    // ============================================================
    // 3️⃣ Buuin ang date filter (kung may from/to)
    // ============================================================
    const dateFilter = {};

    if (!showAll && (from || to)) {
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
    // 4️⃣ Kunin ang PMS records
    // ============================================================
    const pmsRecord = await PMSMaintenanceController.find({
        laboratoryId,
        ...dateFilter,
    })
        .populate("equipmentId")
        .sort({ createdAt: -1 });

    console.log("pmsRecord", pmsRecord);
    console.log("performedBy", performedBy);

    // ============================================================
    // 5️⃣ Response
    // ============================================================
    res.status(200).json({
        status: "success",
        pmsRecord,
        data: {
            _id: laboratoryId,
            LaboratoryName: laboratory[0].LaboratoryName,
            performedBy, // isama ang performedBy
        },
    });
});

// ============================================================
// CREATE — Add new PMS005 record
// ============================================================
exports.createPMS005 = AsyncErrorHandler(async (req, res, next) => {
    const { equipmentId, laboratoryId } = req.body;

    console.log("BODY", req.body);

    // Validate equipmentId
    if (!equipmentId) {
        return next(new CustomError("Equipment ID is required", 400));
    }

    if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
        return next(new CustomError("Invalid Equipment ID format", 400));
    }

    // Validate laboratoryId
    if (!laboratoryId) {
        return next(new CustomError("Laboratory ID is required", 400));
    }

    if (!mongoose.Types.ObjectId.isValid(laboratoryId)) {
        return next(new CustomError("Invalid Laboratory ID format", 400));
    }

    // Check kung existing ang Equipment
    const equipmentExists = await Equipment.findById(equipmentId);
    if (!equipmentExists) {
        return next(new CustomError("Equipment not found", 404));
    }

    // Check kung existing ang Laboratory
    const laboratoryExists = await Laboratory.findById(laboratoryId);
    if (!laboratoryExists) {
        return next(new CustomError("Laboratory not found", 404));
    }

    // Create record
    const newRecord = await PMSMaintenanceController.create(req.body);

    if (!newRecord) {
        return next(new CustomError("Failed to create PMS005 record", 400));
    }

    // Populate equipment details
    const populated = await newRecord.populate("equipmentId");

    res.status(201).json({
        status: "success",
        data: populated,
    });
});

// ============================================================
// GET ALL — List all PMS005 records
// ============================================================
exports.getAllPMS005 = AsyncErrorHandler(async (req, res, next) => {
    const records = await PMSMaintenanceController.find()
        .populate("equipmentId")
        .populate("laboratoryId")
        .sort({ Date: -1, createdAt: -1 });

    res.status(200).json({
        status: "success",
        totalRecords: records.length,
        data: records,
    });
});

// ============================================================
// GET BY ID — Single PMS005 record
// ============================================================
exports.getPMS005ById = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    const record = await PMSMaintenanceController.findById(
        req.params.id
    )
        .populate("equipmentId")
        .populate("laboratoryId");

    if (!record) {
        return next(new CustomError("PMS005 record not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: record,
    });
});

// ============================================================
// GET BY EQUIPMENT ID — Lahat ng PMS005 history ng isang equipment
// ============================================================
exports.getPMS005ByEquipmentId = AsyncErrorHandler(
    async (req, res, next) => {
        const { equipmentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
            return next(
                new CustomError("Invalid Equipment ID format", 400)
            );
        }

        const records = await PMSMaintenanceController.find({
            equipmentId,
        })
            .populate("equipmentId")
            .populate("laboratoryId")
            .sort({ Date: -1, createdAt: -1 });

        res.status(200).json({
            status: "success",
            totalRecords: records.length,
            data: records,
        });
    }
);

// ============================================================
// UPDATE — Update existing PMS005 record
// ============================================================
exports.updatePMS005 = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    // Filter out empty values — huwag i-update ang fields na walang value
    const filteredBody = {};
    Object.keys(req.body).forEach((key) => {
        const value = req.body[key];
        if (value !== "" && value !== null && value !== undefined) {
            filteredBody[key] = value;
        }
    });

    // Validate equipmentId kung binago
    if (
        filteredBody.equipmentId &&
        !mongoose.Types.ObjectId.isValid(filteredBody.equipmentId)
    ) {
        return next(new CustomError("Invalid Equipment ID format", 400));
    }

    // Validate laboratoryId kung binago
    if (
        filteredBody.laboratoryId &&
        !mongoose.Types.ObjectId.isValid(filteredBody.laboratoryId)
    ) {
        return next(new CustomError("Invalid Laboratory ID format", 400));
    }

    const updated = await PMSMaintenanceController.findByIdAndUpdate(
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
        return next(new CustomError("PMS005 record not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: updated,
    });
});

// ============================================================
// DELETE — Remove PMS005 record
// ============================================================
exports.deletePMS005 = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    const deleted = await PMSMaintenanceController.findByIdAndDelete(
        req.params.id
    );

    if (!deleted) {
        return next(new CustomError("PMS005 record not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: null,
    });
});

// ============================================================
// DISPLAY ALL PMS005 — with Encharge matching + optional date filter
// ============================================================
exports.DisplayAllPMS005 = AsyncErrorHandler(async (req, res) => {
    try {
        const userID = req.user._id;
        const role = req.user.role;

        console.log("triggerrr____ DisplayAllPMS005");

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
        // STEP 6: Matching — PMS005 records lang ng lab
        // ============================================================
        const pms005Query = { ...dateFilter };

        if (laboratoryId) {
            // ⚠️ Kung may `laboratoryId` field ang PMS005, direct match:
            pms005Query.laboratoryId = laboratoryId;

            // ⚠️ KUNG WALANG `laboratoryId` sa PMS005, gamitin ang equipment approach:
            // const equipmentList = await Equipment.find(
            //     { laboratory: laboratoryId },
            //     { _id: 1 }
            // ).lean();
            // const equipmentIds = equipmentList.map((e) => e._id);
            // if (equipmentIds.length > 0) {
            //     pms005Query.equipmentId = { $in: equipmentIds };
            // } else {
            //     pms005Query._id = { $in: [] };
            // }
        }

        // ============================================================
        // STEP 7: Kunin ang PMS005 records — matching + date filter
        // ============================================================
        const pmsRecord = await PMSMaintenanceController.find(pms005Query)
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
        console.error("❌ DisplayAllPMS005 error:", error);

        if (!res.headersSent) {
            return res.status(500).json({
                status: "fail",
                message:
                    error?.message ||
                    "An error occurred while fetching PMS005 records.",
            });
        }
    }
});
