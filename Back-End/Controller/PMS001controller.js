// src/Controllers/PMS001Controller.js

const AsyncErrorHandler = require("../Utils/AsyncErrorHandler");
const mongoose = require("mongoose");
const CustomError = require("../Utils/CustomError");
const PMSMaintenanceController = require("../Models/PMS001");
const Equipment = require("../Models/Equipment");
const Laboratory = require("../Models/Laboratory")

// ============================================================
// CREATE — Add new PMS001 record
// ============================================================
exports.createPMS001 = AsyncErrorHandler(async (req, res, next) => {
    const { equipmentId } = req.body;

    console.log("BODY", req.body)

    // Validate equipmentId
    if (!equipmentId) {
        return next(new CustomError("Equipment ID is required", 400));
    }

    if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
        return next(new CustomError("Invalid Equipment ID format", 400));
    }

    // Check kung existing ang Equipment
    const equipmentExists = await Equipment.findById(equipmentId);
    if (!equipmentExists) {
        return next(new CustomError("Equipment not found", 404));
    }

    // Create record
    const newRecord = await PMSMaintenanceController.create(req.body);

    if (!newRecord) {
        return next(new CustomError("Failed to create PMS record", 400));
    }

    // Populate equipment details
    const populated = await newRecord.populate("equipmentId");

    res.status(201).json({
        status: "success",
        data: populated,
    });
});

// ============================================================
// GET ALL — List all PMS001 records
// ============================================================
exports.getAllPMS001 = AsyncErrorHandler(async (req, res, next) => {
    const records = await PMSMaintenanceController.find()
        .populate("equipmentId")
        .sort({ createdAt: -1 });

    res.status(200).json({
        status: "success",
        totalRecords: records.length,
        data: records,
    });
});

// ============================================================
// GET BY ID — Single PMS001 record
// ============================================================
exports.getPMS001ById = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    const record = await PMSMaintenanceController.findById(
        req.params.id
    ).populate("equipmentId");

    if (!record) {
        return next(new CustomError("PMS record not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: record,
    });
});

// ============================================================
// GET BY EQUIPMENT ID — Lahat ng PMS history ng isang equipment
// ============================================================
exports.getPMS001ByEquipmentId = AsyncErrorHandler(
    async (req, res, next) => {
        const { equipmentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
            return next(new CustomError("Invalid Equipment ID format", 400));
        }

        const records = await PMSMaintenanceController.find({ equipmentId })
            .populate("equipmentId")
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: "success",
            totalRecords: records.length,
            data: records,
        });
    }
);

// ============================================================
// UPDATE — Update existing PMS001 record
// ============================================================
exports.updatePMS001 = AsyncErrorHandler(async (req, res, next) => {
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

    const updated = await PMSMaintenanceController.findByIdAndUpdate(
        req.params.id,
        filteredBody,
        {
            new: true,
            runValidators: true,
        }
    ).populate("equipmentId");

    if (!updated) {
        return next(new CustomError("PMS record not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: updated,
    });
});

// ============================================================
// DELETE — Remove PMS001 record
// ============================================================
exports.deletePMS001 = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    const deleted = await PMSMaintenanceController.findByIdAndDelete(
        req.params.id
    );

    if (!deleted) {
        return next(new CustomError("PMS record not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: null,
    });
});


// src/Controllers/PMS002Controller.js

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
    // 1️⃣ Hanapin ang Laboratory ng user
    // ============================================================
    const laboratory = await Laboratory.aggregate([
        {
            $match: { Encharge: userObjectId },
        },
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
            message: "No laboratory found for this user.",
        });
    }

    const laboratoryId = laboratory[0]._id;

    // ============================================================
    // 2️⃣ Query flags
    // ============================================================
    const { from, to, all } = req.query;

    const showAll = all === "true" || all === "1";

    // ✅ Kung walang from, walang to, at hindi 'all' → empty
    if (!showAll && !from && !to) {
        return res.status(200).json({
            status: "success",
            pmsRecord: [], // ✅ empty array
            data: {
                _id: laboratoryId,
                LaboratoryName: laboratory[0].LaboratoryName,
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
    //    - Kapag showAll → walang date filter (lahat)
    //    - Kapag may from/to → filtered
    // ============================================================
    const pmsRecord = await PMSMaintenanceController.find({
        laboratoryId,
        ...dateFilter,
    })
        .populate("equipmentId")
        .sort({ createdAt: -1 });

    // ============================================================
    // 5️⃣ Response
    // ============================================================
    res.status(200).json({
        status: "success",
        pmsRecord,
        data: {
            _id: laboratoryId,
            LaboratoryName: laboratory[0].LaboratoryName,
        },
    });
});


// src/Controllers/PMS002Controller.js

exports.DisplayAllPMS001 = AsyncErrorHandler(async (req, res) => {
    // ============================================================
    //  Kunin lahat ng Laboratory
    // ============================================================
    const laboratory = await Laboratory.aggregate([
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

    // ============================================================
    // 2️⃣ Query flags (optional date filter)
    // ============================================================
    const { from, to } = req.query;

    // ============================================================
    // 3️⃣ Buuin ang date filter (kung may from/to)
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
    // 4️⃣ Kunin LAHAT ng PMS records
    //    - Kapag may from/to → filtered by date
    //    - Kapag wala → lahat ng records
    // ============================================================
    const pmsRecord = await PMSMaintenanceController.find({
        ...dateFilter,
    })
        .populate("equipmentId")
        .sort({ createdAt: -1 });

    // ============================================================
    // 5️⃣ Response
    // ============================================================
    res.status(200).json({
        status: "success",
        pmsRecord,
        data: {
            _id: laboratoryId,
            LaboratoryName: laboratory[0].LaboratoryName,
        },
    });
});