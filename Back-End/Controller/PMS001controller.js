const AsyncErrorHandler = require("../Utils/AsyncErrorHandler");
const mongoose = require("mongoose");
const CustomError = require("../Utils/CustomError");
const PMSMaintenanceController = require("../Models/PMS001");
const Equipment = require("../Models/Equipment");
const Laboratory = require("../Models/Laboratory");
const PMS002 = require("../Models/PMS002");
const PMS003 = require("../Models/PMS003");
const PMS004 = require("../Models/PMS004");
const PMS005 = require("../Models/PMS005");
const PMS006 = require("../Models/PMS006");
const PMS007 = require("../Models/PMS007");

// ============================================================
// ✅ SAFE MODEL RESOLVER — handle mixed CJS/ESM exports
// ============================================================
function resolveModel(mod, name) {
    if (!mod) {
        throw new Error(`${name}: module is undefined/null.`);
    }
    // 1) Direktang model (module.exports = Model)
    if (typeof mod.create === "function") return mod;

    // 2) ES module default export (export default Model)
    if (mod.default && typeof mod.default.create === "function") {
        return mod.default;
    }

    // 3) Named export na model (module.exports = { PMS003 })
    for (const key of Object.keys(mod)) {
        const candidate = mod[key];
        if (candidate && typeof candidate.create === "function") {
            return candidate;
        }
    }

    throw new Error(
        `${name}: Cannot resolve model. Got: ${typeof mod}, keys: ${Object.keys(
            mod || {}
        ).join(",")}`
    );
}

// ✅ Resolve lahat ng PMS models
const PMS002Model = resolveModel(PMS002, "PMS002");
const PMS003Model = resolveModel(PMS003, "PMS003");
const PMS004Model = resolveModel(PMS004, "PMS004");
const PMS005Model = resolveModel(PMS005, "PMS005");
const PMS006Model = resolveModel(PMS006, "PMS006");
const PMS007Model = resolveModel(PMS007, "PMS007");

// ✅ DEBUG — alisin pag okay na
console.log("=== IMPORT CHECK ===");
[
    ["PMS002", PMS002Model],
    ["PMS003", PMS003Model],
    ["PMS004", PMS004Model],
    ["PMS005", PMS005Model],
    ["PMS006", PMS006Model],
    ["PMS007", PMS007Model],
].forEach(([name, m]) => {
    console.log(`${name}: ${m.modelName} ✅`);
});
console.log("====================");

// ============================================================
// CREATE — Add new PMS001 record + auto-create PMS002–PMS007
// ============================================================
exports.createPMS001 = AsyncErrorHandler(async (req, res, next) => {
    try {
        const { equipmentId, laboratoryId } = req.body;

        console.log("📥 BODY:", req.body);

        // ---------- VALIDATION ----------
        if (!equipmentId) {
            return next(new CustomError("Equipment ID is required", 400));
        }
        if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
            return next(
                new CustomError("Invalid Equipment ID format", 400)
            );
        }

        // ---------- EQUIPMENT CHECK ----------
        let equipmentExists;
        try {
            equipmentExists = await Equipment.findById(equipmentId);
        } catch (err) {
            console.error("💥 Equipment lookup failed:", err);
            return next(
                new CustomError(
                    `Equipment lookup failed: ${err.message}`,
                    500
                )
            );
        }

        if (!equipmentExists) {
            return next(new CustomError("Equipment not found", 404));
        }

        // ---------- LABORATORY RESOLVE ----------
        const resolvedLaboratoryId =
            laboratoryId || equipmentExists.laboratoryId || null;

        if (!resolvedLaboratoryId) {
            return next(
                new CustomError(
                    "Laboratory ID is required (not found in body or equipment)",
                    400
                )
            );
        }

        // ---------- 1. CREATE PMS001 ----------
        let newRecord;
        try {
            newRecord = await PMSMaintenanceController.create(req.body);
        } catch (err) {
            console.error("💥 PMS001 create failed:", err);
            return next(
                new CustomError(
                    `Failed to create PMS001: ${err.message}`,
                    400
                )
            );
        }

        if (!newRecord) {
            return next(
                new CustomError("Failed to create PMS record", 400)
            );
        }

        console.log("✅ PMS001 created:", newRecord._id);

        // ---------- 2. CREATE PMS002–PMS007 ----------
        const pmsModels = [
            { name: "PMS002", model: PMS002Model, extra: {} },
            {
                name: "PMS003",
                model: PMS003Model,
                extra: { date: newRecord.createdAt || new Date() },
            },
            { name: "PMS004", model: PMS004Model, extra: {} },
            { name: "PMS005", model: PMS005Model, extra: {} },
            { name: "PMS006", model: PMS006Model, extra: {} },
            { name: "PMS007", model: PMS007Model, extra: {} },
        ];

        const pmsResults = await Promise.allSettled(
            pmsModels.map(({ name, model, extra }) =>
                model
                    .create({
                        pms001Id: newRecord._id,
                        equipmentId: newRecord.equipmentId,
                        laboratoryId: resolvedLaboratoryId,
                        ...extra,
                    })
                    .then((doc) => ({ name, doc }))
            )
        );

        // ---------- 3. COLLECT RESULTS ----------
        const pmsRecords = {};
        const pmsErrors = {};

        pmsResults.forEach((result, index) => {
            const { name } = pmsModels[index];

            if (result.status === "fulfilled") {
                pmsRecords[name] = result.value.doc;
                console.log(`✅ ${name} created:`, result.value.doc._id);
            } else {
                const err = result.reason;
                const errDetail = {
                    name: err?.name,
                    message: err?.message,
                    validation: err?.errors
                        ? Object.keys(err.errors).reduce((acc, k) => {
                              acc[k] = err.errors[k].message;
                              return acc;
                          }, {})
                        : undefined,
                };
                console.error(`💥 ${name} create failed:`, errDetail);
                pmsRecords[name] = null;
                pmsErrors[name] = errDetail;
            }
        });

        // ---------- 4. POPULATE PMS001 ----------
        let populated;
        try {
            populated = await newRecord.populate("equipmentId");
        } catch (err) {
            console.error("💥 Populate failed:", err);
            populated = newRecord;
        }

        // ---------- 5. RESPONSE ----------
        const hasErrors = Object.keys(pmsErrors).length > 0;

        return res.status(hasErrors ? 207 : 201).json({
            status: hasErrors ? "partial" : "success",
            data: populated,
            linkedRecords: pmsRecords,
            linkedErrors: hasErrors ? pmsErrors : undefined,
        });
    } catch (err) {
        // ---------- GLOBAL CATCH ----------
        console.error("💥 createPMS001 CRASHED:");
        console.error("Message:", err.message);
        console.error("Name:", err.name);
        console.error("Stack:", err.stack);

        return next(
            new CustomError(
                `Internal server error: ${err.message}`,
                500
            )
        );
    }
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

    // Filter out empty values
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
// DELETE — Remove PMS001 record + auto-delete linked PMS002–PMS007
// ============================================================
exports.deletePMS001 = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    const { id } = req.params;

    const deleted = await PMSMaintenanceController.findByIdAndDelete(id);

    if (!deleted) {
        return next(new CustomError("PMS record not found", 404));
    }

    // ✅ Auto-delete lahat ng linked PMS002–PMS007
    const cascadeModels = [
        { name: "PMS002", model: PMS002Model },
        { name: "PMS003", model: PMS003Model },
        { name: "PMS004", model: PMS004Model },
        { name: "PMS005", model: PMS005Model },
        { name: "PMS006", model: PMS006Model },
        { name: "PMS007", model: PMS007Model },
    ];

    const cascadeResults = await Promise.allSettled(
        cascadeModels.map(({ name, model }) =>
            model
                .deleteMany({ pms001Id: id })
                .then((result) => ({
                    name,
                    deletedCount: result.deletedCount,
                }))
        )
    );

    const cascadeDeleted = {};
    cascadeResults.forEach((result, index) => {
        const { name } = cascadeModels[index];
        if (result.status === "fulfilled") {
            cascadeDeleted[name] = result.value.deletedCount;
        } else {
            console.error(
                `💥 ${name} cascade delete failed:`,
                result.reason?.message
            );
            cascadeDeleted[name] = 0;
        }
    });

    res.status(200).json({
        status: "success",
        data: null,
        cascadeDeleted,   // ✅ ilang records bawat PMS00X na-delete
    });
});

// ============================================================
// FIND BY EQUIPMENT — PMS records ng user's assigned laboratory
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

    // 1️⃣ Hanapin ang Laboratory ng user
    const laboratory = await Laboratory.aggregate([
        { $match: { Encharge: userObjectId } },
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

    // 2️⃣ Query flags
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

    // 3️⃣ Buuin ang date filter
    const dateFilter = {};

    if (!showAll && (from || to)) {
        dateFilter.createdAt = {};

        if (from) {
            const fromDate = new Date(from);
            if (isNaN(fromDate.getTime())) {
                return res.status(400).json({
                    status: "fail",
                    message:
                        "Invalid 'from' date format. Use YYYY-MM-DD.",
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
                    message:
                        "Invalid 'to' date format. Use YYYY-MM-DD.",
                });
            }
            toDate.setHours(23, 59, 59, 999);
            dateFilter.createdAt.$lte = toDate;
        }
    }

    // 4️⃣ Kunin ang PMS records
    const pmsRecord = await PMSMaintenanceController.find({
        laboratoryId,
        ...dateFilter,
    })
        .populate("equipmentId")
        .sort({ createdAt: -1 });

    // 5️⃣ Response
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
// DISPLAY ALL PMS001 — with optional date filter
// ============================================================
exports.DisplayAllPMS001 = AsyncErrorHandler(async (req, res) => {
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

    // 2️⃣ Query flags (optional date filter)
    const { from, to } = req.query;

    // 3️⃣ Buuin ang date filter
    const dateFilter = {};

    if (from || to) {
        dateFilter.createdAt = {};

        if (from) {
            const fromDate = new Date(from);
            if (isNaN(fromDate.getTime())) {
                return res.status(400).json({
                    status: "fail",
                    message:
                        "Invalid 'from' date format. Use YYYY-MM-DD.",
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
                    message:
                        "Invalid 'to' date format. Use YYYY-MM-DD.",
                });
            }
            toDate.setHours(23, 59, 59, 999);
            dateFilter.createdAt.$lte = toDate;
        }
    }

    // 4️⃣ Kunin LAHAT ng PMS records
    const pmsRecord = await PMSMaintenanceController.find({
        ...dateFilter,
    })
        .populate("equipmentId")
        .sort({ createdAt: -1 });

    // 5️⃣ Response
    res.status(200).json({
        status: "success",
        pmsRecord,
        data: {
            _id: laboratoryId,
            LaboratoryName: laboratory[0].LaboratoryName,
        },
    });
});