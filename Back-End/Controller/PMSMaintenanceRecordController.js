const AsyncErrorHandler = require("../Utils/AsyncErrorHandler");
const MaintenanceRecord = require("../Models/PmsMaintenanceRecord");
const mongoose = require('mongoose');
const Equipment = require("../Models/Equipment");
const Laboratory = require("../Models/Laboratory");

// ======================
// CREATE
// ======================
exports.AddMaintenanceRecord = AsyncErrorHandler(async (req, res) => {
    const {
        code,
        EquipmentId,
        Lubrication,
        Overhauling,
        Replace_worn_out_parts,
        General_Recondition,
        RepairParts,
        MinorAdjustment,
        Repair,
        RoutineInspectionCleaning,
        remarks,
    } = req.body;

    const performedBy = req.user._id;

    console.log("performedBy", performedBy)

    // Validate required fields
    if (!EquipmentId) {
        return res.status(400).json({
            status: "fail",
            message: "EquipmentId is required.",
        });
    }

    // At least isang work performed
    if (
        !Lubrication &&
        !Overhauling &&
        !Replace_worn_out_parts &&
        !General_Recondition &&
        !RepairParts &&
        !MinorAdjustment &&
        !Repair &&
        !RoutineInspectionCleaning
    ) {
        return res.status(400).json({
            status: "fail",
            message: "At least one work performed must be selected.",
        });
    }

    const record = await MaintenanceRecord.create({
        code,
        EquipmentId,
        performedBy: performedBy,
        Lubrication: Lubrication || false,
        Overhauling: Overhauling || false,
        Replace_worn_out_parts: Replace_worn_out_parts || false,
        General_Recondition: General_Recondition || false,
        RepairParts: RepairParts || false,
        MinorAdjustment: MinorAdjustment || false,
        Repair: Repair || false,
        RoutineInspectionCleaning: RoutineInspectionCleaning || false,
        remarks,
    });

    res.status(201).json({
        status: "success",
        message: "Maintenance record added successfully.",
        data: record,
    });
});

exports.DisplayMaintenanceRecords = AsyncErrorHandler(async (req, res) => {
    const { page = 1, limit = 10, equipmentId, performedBy } = req.query;

    const matchStage = {};
    if (equipmentId) {
        matchStage.EquipmentId = new mongoose.Types.ObjectId(equipmentId);
    }
    if (performedBy) {
        matchStage.performedBy = new mongoose.Types.ObjectId(performedBy);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const records = await MaintenanceRecord.aggregate([
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: Number(limit) },

        //  LOOKUP EQUIPMENT
        {
            $lookup: {
                from: "equipments",
                let: { equipId: "$EquipmentId" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$_id", "$$equipId"] } } },

                    //  NESTED LOOKUP — Category ng Equipment
                    {
                        $lookup: {
                            from: "categories", // 👈 collection name ng Category
                            localField: "Category",
                            foreignField: "_id",
                            as: "CategoryInfo",
                        },
                    },
                    {
                        $unwind: {
                            path: "$CategoryInfo",
                            preserveNullAndEmptyArrays: true,
                        },
                    },

                    //  Project fields
                    {
                        $project: {
                            _id: 1,
                            Brand: 1,
                            SerialNumber: 1,
                            Specification: 1,
                            status: 1,
                            remarks: 1,
                            DateTime: 1,
                            Category: 1,
                            CategoryInfo: {
                                _id: 1,
                                CategoryName: 1, // 👈 palitan ng tamang field name sa Category schema mo
                                // idagdag ang iba pang fields ng Category kung kailangan
                            },
                        },
                    },
                ],
                as: "EquipmentId",
            },
        },
        {
            $unwind: {
                path: "$EquipmentId",
                preserveNullAndEmptyArrays: true,
            },
        },

        //  LOOKUP USER (performedBy)
        {
            $lookup: {
                from: "users",
                let: { userId: "$performedBy" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            FirstName: 1,
                            Middle: 1,
                            LastName: 1,
                            role: 1,
                        },
                    },
                ],
                as: "performedBy",
            },
        },
        {
            $unwind: {
                path: "$performedBy",
                preserveNullAndEmptyArrays: true,
            },
        },
    ]);

    const totalRecords = await MaintenanceRecord.countDocuments(matchStage);

    res.status(200).json({
        status: "success",
        totalRecords,
        currentPage: Number(page),
        totalPages: Math.ceil(totalRecords / limit),
        data: records,
    });
});

exports.DisplayByEquipmentRecord = AsyncErrorHandler(async (req, res) => {
    const { equipmentId } = req.params;
    const { page = 1, limit = 10, performedBy } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Validate equipmentId
    if (!equipmentId || !mongoose.Types.ObjectId.isValid(equipmentId)) {
        return res.status(400).json({
            status: "fail",
            message: "Invalid or missing equipmentId",
        });
    }

    const matchStage = {
        EquipmentId: new mongoose.Types.ObjectId(equipmentId),
    };

    // Optional filter: performedBy
    if (performedBy) {
        if (!mongoose.Types.ObjectId.isValid(performedBy)) {
            return res.status(400).json({
                status: "fail",
                message: "Invalid performedBy",
            });
        }
        matchStage.performedBy = new mongoose.Types.ObjectId(performedBy);
    }

    // ==========================================
    // QUERY WITH POPULATE
    // ==========================================
    const records = await MaintenanceRecord.find(matchStage)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate({
            path: "EquipmentId",
            select: "Brand BrandName SerialNumber Specification status remarks DateTime Category",
            populate: {
                path: "Category",
                select: "CategoryName",
            },
        })
        .populate({
            path: "performedBy",
            select: "username FirstName Middle LastName role",
        })
        .lean();   // 👈 para maging plain JS object (mas mabilis, kaso nawawala ang virtuals)

    const totalRecords = await MaintenanceRecord.countDocuments(matchStage);

    res.status(200).json({
        status: "success",
        totalRecords,
        currentPage: pageNum,
        totalPages: Math.ceil(totalRecords / limitNum),
        data: records,
    });
});


// ======================
// UPDATE
// ======================
exports.UpdateMaintenanceRecord = AsyncErrorHandler(async (req, res) => {
    const {
        code,
        EquipmentId,
        Lubrication,
        Overhauling,
        Replace_worn_out_parts,
        General_Recondition,
        RepairParts,
        MinorAdjustment,
        Repair,
        RoutineInspectionCleaning,
        remarks,
    } = req.body;

    const existingRecord = await MaintenanceRecord.findById(req.params.id);

    if (!existingRecord) {
        return res.status(404).json({
            status: "fail",
            message: "Maintenance record not found.",
        });
    }

    const updatedRecord = await MaintenanceRecord.findByIdAndUpdate(
        req.params.id,
        {
            code: code !== undefined ? code : existingRecord.code,
            EquipmentId: EquipmentId || existingRecord.EquipmentId,
            Lubrication:
                Lubrication !== undefined ? Lubrication : existingRecord.Lubrication,
            Overhauling:
                Overhauling !== undefined ? Overhauling : existingRecord.Overhauling,
            Replace_worn_out_parts:
                Replace_worn_out_parts !== undefined
                    ? Replace_worn_out_parts
                    : existingRecord.Replace_worn_out_parts,
            General_Recondition:
                General_Recondition !== undefined
                    ? General_Recondition
                    : existingRecord.General_Recondition,
            RepairParts:
                RepairParts !== undefined
                    ? RepairParts
                    : existingRecord.RepairParts,
            MinorAdjustment:
                MinorAdjustment !== undefined
                    ? MinorAdjustment
                    : existingRecord.MinorAdjustment,
            Repair: Repair !== undefined ? Repair : existingRecord.Repair,
            RoutineInspectionCleaning:
                RoutineInspectionCleaning !== undefined
                    ? RoutineInspectionCleaning
                    : existingRecord.RoutineInspectionCleaning,
            remarks: remarks !== undefined ? remarks : existingRecord.remarks,
        },
        {
            new: true,
            runValidators: true,
        }
    );

    res.status(200).json({
        status: "success",
        message: "Maintenance record updated successfully.",
        data: updatedRecord,
    });
});

// ======================
// DELETE
// ======================
exports.DeleteMaintenanceRecord = AsyncErrorHandler(async (req, res) => {
    const record = await MaintenanceRecord.findById(req.params.id);

    if (!record) {
        return res.status(404).json({
            status: "fail",
            message: "Maintenance record not found.",
        });
    }

    await MaintenanceRecord.findByIdAndDelete(req.params.id);

    res.status(200).json({
        status: "success",
        message: "Maintenance record deleted successfully.",
        data: null,
    });
});


exports.PMS001getdata = AsyncErrorHandler(async(req, res) => {
    const userId = req.user?._id;

    if (!userId) {
        return res.status(400).json({
            status: "fail",
            message: "User ID not found in request.",
        });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

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

})