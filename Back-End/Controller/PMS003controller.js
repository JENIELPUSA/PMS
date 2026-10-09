// src/Controllers/PMS002Controller.js
const AsyncErrorHandler = require("../Utils/AsyncErrorHandler");
const mongoose = require("mongoose");
const CustomError = require("../Utils/CustomError");
const PMS003 = require("../Models/PMS003");
const Equipment = require("../Models/Equipment");
const Laboratory = require("../Models/Laboratory");
const Assign= require("../Models/AssigningEquipment")


exports.FindByCode = AsyncErrorHandler(async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user?._id;

    // ============================================================
    // VALIDATION
    // ============================================================
    if (!userId) {
      return res.status(400).json({
        status: "fail",
        message: "User ID not found in request.",
      });
    }

    if (!code) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide a code",
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const cleanCode = code.trim();

    // ============================================================
    // STEP 1: AGGREGATION
    //  ✅ Kasama na ang CategoryName (Type) at LaboratoryName (Location)
    // ============================================================
    console.log("🔍 [2] Running Assign aggregation...");

    const result = await Assign.aggregate([
      {
        $lookup: {
          from: "laboratories",
          let: { labId: "$Laboratory" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$labId"] },
                    { $eq: ["$Encharge", userObjectId] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                LaboratoryName: 1,
              },
            },
          ],
          as: "LaboratoryData",
        },
      },
      { $unwind: "$LaboratoryData" },
      {
        $lookup: {
          from: "equipment",
          localField: "Equipments",
          foreignField: "_id",
          as: "EquipmentData",
        },
      },
      { $unwind: "$EquipmentData" },
      {
        $match: {
          "EquipmentData.code": {
            $regex: `^${cleanCode}$`,
            $options: "i",
          },
        },
      },
      // ✅ BAGONG LOOKUP — Category
      {
        $lookup: {
          from: "categories",
          localField: "EquipmentData.Category",
          foreignField: "_id",
          as: "CategoryData",
        },
      },
      {
        $unwind: {
          path: "$CategoryData",
          preserveNullAndEmptyArrays: true, // ✅ kahit walang category, hindi mawawala
        },
      },
      {
        $project: {
          _id: 0,
          equipmentId: "$EquipmentData._id",
          code: "$EquipmentData.code",
          Brand: "$EquipmentData.Brand",
          DateAcquired: "$EquipmentData.DateAcquired",
          Category: "$EquipmentData.Category",
          // ✅ Type galing sa Category
          Type: "$CategoryData.CategoryName",
          categoryName: "$CategoryData.CategoryName",
          SerialNumber: "$EquipmentData.SerialNumber",
          Specification: "$EquipmentData.Specification",
          // ✅ Location galing sa Laboratory
          Location: "$LaboratoryData.LaboratoryName",
          laboratoryId: "$LaboratoryData._id",
          LaboratoryName: "$LaboratoryData.LaboratoryName",
        },
      },
      { $limit: 1 },
    ]);

    console.log("🔍 [3] Aggregation result:", result?.length || 0);

    if (!result || result.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: `No equipment found with code: ${cleanCode} in your assigned laboratory.`,
      });
    }

    const equipment = result[0];
    const equipmentId = equipment.equipmentId;

    console.log("🔍 [4] Equipment found:", {
      equipmentId: String(equipmentId),
      code: equipment.code,
      Brand: equipment.Brand,
      Type: equipment.Type,
      Location: equipment.Location,
    });

    // ============================================================
    // STEP 2: PMS003 QUERY
    // ============================================================
    console.log("🔍 [5] Querying PMS003 with equipmentId:", String(equipmentId));

    const PMS003Data = await PMS003.find({
      equipmentId: equipmentId,
    })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    console.log("✅ [6] PMS003 records found:", PMS003Data);

    // ============================================================
    // STEP 3: MANUAL POPULATE (safe)
    // ============================================================
    const enrichedPMS003Data = await Promise.all(
      PMS003Data.map(async (rec) => {
        try {
          const eq = await Equipment.findById(rec.equipmentId)
            .select(
              "code Brand SerialNumber Specification Category DateAcquired"
            )
            .lean();

          return {
            ...rec,
            equipmentId: eq || rec.equipmentId,
          };
        } catch (err) {
          console.error("  ⚠️ Enrich error for record:", rec._id, err.message);
          return rec;
        }
      })
    );

    console.log("✅ [7] Enriched PMS003Data:", enrichedPMS003Data.length);

    // ============================================================
    // RESPONSE
    // ✅ Kasama na ang Type, Location, at iba pa
    // ============================================================
    return res.status(200).json({
      status: "success",
      data: {
        _id: equipmentId,
        code: equipment.code,
        Brand: equipment.Brand,
        DateAcquired: equipment.DateAcquired,
        Category: equipment.Category,
        // ✅ BAGONG FIELD — Type
        Type: equipment.Type || "",
        categoryName: equipment.categoryName || "",
        SerialNumber: equipment.SerialNumber,
        Specification: equipment.Specification,
        // ✅ Location
        Location: equipment.Location || "",
        laboratoryId: equipment.laboratoryId || null,
        LaboratoryName: equipment.LaboratoryName || "",
      },
      PMS003Data: enrichedPMS003Data,
    });
  } catch (error) {
    console.error("❌❌❌ FindByCode CRASHED ❌❌❌");
    console.error("  Name:", error.name);
    console.error("  Message:", error.message);
    console.error("  Stack:", error.stack);

    return res.status(500).json({
      status: "fail",
      message: "Server error: " + error.message,
      error: error.message,
      stack: error.stack,
    });
  }
});
// ============================================================
// FIND BY EQUIPMENT — Hanapin ang PMS records ng user's lab
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
            pmsRecord: [],
            data: {
                _id: laboratoryId,
                LaboratoryName: laboratory[0].LaboratoryName,
            },
        });
    }

    // ============================================================
    // 3️⃣ Buuin ang date filter (base sa `date` field)
    // ============================================================
    const dateFilter = {};

    if (!showAll && (from || to)) {
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
    // 4️⃣ Kunin ang PMS records
    // ============================================================
    const pmsRecord = await PMS003.find({
        laboratoryId,
        ...dateFilter,
    })
        .populate("equipmentId")
        .sort({ date: -1, createdAt: -1 });

    console.log("pmsRecord", pmsRecord);

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

// ============================================================
// CREATE — Add new PMS002 record
// ============================================================
exports.createPMS002 = AsyncErrorHandler(async (req, res, next) => {
    const {
        equipmentId,
        laboratoryId,
        date,
        routineInspection,
        lubrication,
        overhauling,
        minorAdjustment,
        replaceWornOutParts,
        repair,
        generalRecondition,
        repairPart,
    } = req.body;

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

    // ✅ Validate & parse date kung meron
    let parsedDate = null;
    if (date) {
        parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return next(
                new CustomError("Invalid date format. Use YYYY-MM-DD.", 400)
            );
        }
    }

    // Create record
    const newRecord = await PMS003.create({
        equipmentId,
        laboratoryId,
        date: parsedDate,
        routineInspection: routineInspection || "", // ✅ String, hindi Boolean
        lubrication: Boolean(lubrication),
        overhauling: Boolean(overhauling),
        minorAdjustment: Boolean(minorAdjustment),
        replaceWornOutParts: Boolean(replaceWornOutParts),
        repair: Boolean(repair),
        generalRecondition: Boolean(generalRecondition),
        repairPart: Boolean(repairPart),
    });

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
// GET ALL — List all PMS002 records
// ============================================================
exports.getAllPMS002 = AsyncErrorHandler(async (req, res, next) => {
    const records = await PMS003.find()
        .populate("equipmentId")
        .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
        status: "success",
        totalRecords: records.length,
        data: records,
    });
});

// ============================================================
// GET BY ID — Single PMS002 record
// ============================================================
exports.getPMS002ById = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    const record = await PMS003.findById(
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
exports.getPMS002ByEquipmentId = AsyncErrorHandler(
    async (req, res, next) => {
        const { equipmentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
            return next(new CustomError("Invalid Equipment ID format", 400));
        }

        const records = await PMS003.find({ equipmentId })
            .populate("equipmentId")
            .sort({ date: -1, createdAt: -1 });

        res.status(200).json({
            status: "success",
            totalRecords: records.length,
            data: records,
        });
    }
);

// ============================================================
// UPDATE — Update existing PMS002 record
// ============================================================
exports.updatePMS002 = AsyncErrorHandler(async (req, res, next) => {
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

    // ✅ Parse date kung present
    if (filteredBody.date) {
        const parsedDate = new Date(filteredBody.date);
        if (isNaN(parsedDate.getTime())) {
            return next(
                new CustomError("Invalid date format. Use YYYY-MM-DD.", 400)
            );
        }
        filteredBody.date = parsedDate;
    }

    // ✅ I-convert sa Boolean ang work fields kung present
    // (WALANG routineInspection dito — String yun)
    const booleanFields = [
        "lubrication",
        "overhauling",
        "minorAdjustment",
        "replaceWornOutParts",
        "repair",
        "generalRecondition",
        "repairPart",
    ];

    booleanFields.forEach((field) => {
        if (field in filteredBody) {
            filteredBody[field] = Boolean(filteredBody[field]);
        }
    });

    const updated = await PMS003.findByIdAndUpdate(
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
// DELETE — Remove PMS002 record
// ============================================================
exports.deletePMS002 = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    const deleted = await PMS003.findByIdAndDelete(
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

exports.DisplayAllPMS003 = AsyncErrorHandler(async (req, res) => {
    // ============================================================
    // 1️⃣ Kunin lahat ng Laboratory
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

    // ============================================================
    // 2️⃣ Query flags (optional date filter)
    // ============================================================
    const { from, to } = req.query;

    // ============================================================
    // 3️⃣ Buuin ang date filter (base sa `date` field)
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
    // 4️⃣ Kunin LAHAT ng PMS003 records
    //    - Kapag may from/to → filtered by date
    //    - Kapag wala → lahat ng records
    // ============================================================
    const pmsRecord = await PMS003.find({
        ...dateFilter,
    })
        .populate("equipmentId")
        .sort({ date: -1, createdAt: -1 });

    // ============================================================
    // 5️⃣ Response — same output key (pmsRecord)
    // ============================================================
    res.status(200).json({
        status: "success",
        pmsRecord, // ✅ same key
        data: {
            _id: laboratory[0]._id,
            LaboratoryName: laboratory[0].LaboratoryName,
        },
    });
});

