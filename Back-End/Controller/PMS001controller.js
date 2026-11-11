// ============================================================
// controllers/PMS001Controller.js
// ============================================================
const AsyncErrorHandler = require("../Utils/AsyncErrorHandler");
const mongoose = require("mongoose");
const CustomError = require("../Utils/CustomError");

// ---------- MODELS ----------
const PMS001Model = require("../Models/PMS001");
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

// ✅ Resolve lahat ng PMS models (kasama PMS001)
const PMS001Resolved = resolveModel(PMS001Model, "PMS001");
const PMS002Model = resolveModel(PMS002, "PMS002");
const PMS003Model = resolveModel(PMS003, "PMS003");
const PMS004Model = resolveModel(PMS004, "PMS004");
const PMS005Model = resolveModel(PMS005, "PMS005");
const PMS006Model = resolveModel(PMS006, "PMS006");
const PMS007Model = resolveModel(PMS007, "PMS007");

// ✅ DEBUG — alisin pag okay na
console.log("=== IMPORT CHECK ===");
[
    ["PMS001", PMS001Resolved],
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
// ✅ FIX #2 — DEFINE `buildPmsDefaults` (dati missing)
// ============================================================
const buildPmsDefaults = (name, newRecord) => {
    switch (name) {
        case "PMS002":
            return {
                pmsNo: 0,
                remarks: "",
                routineInspection: false,
                lubrication: false,
                overhauling: false,
                minorAdjustment: false,
                replaceWornOutParts: false,
                repair: false,
                generalRecondition: false,
                repairPart: false,
            };
        case "PMS003":
            return {
                date: newRecord?.createdAt || new Date(),
            };
        case "PMS004":
        case "PMS005":
        case "PMS006":
        case "PMS007":
        default:
            return {};
    }
};

// ============================================================
// HELPER — Unwrap whatever shape `create` returns
// ============================================================
const unwrapCreateResult = (result) => {
    if (!result) return null;
    if (result.data !== undefined) return result.data;
    return result;
};

// ============================================================
// HELPER — Extract ObjectId from possibly-populated ref
// ============================================================
const toObjectId = (ref) => {
    if (!ref) return null;
    if (ref instanceof mongoose.Types.ObjectId) return ref;
    if (typeof ref === "object" && ref._id) return ref._id;
    if (mongoose.Types.ObjectId.isValid(ref)) {
        return new mongoose.Types.ObjectId(ref);
    }
    return null;
};

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

        if (!mongoose.Types.ObjectId.isValid(resolvedLaboratoryId)) {
            return next(
                new CustomError("Invalid Laboratory ID format", 400)
            );
        }

        // ---------- 1. CREATE PMS001 ----------
        let newRecord;
        try {
            // ✅ Use the Model directly — NOT PMSMaintenanceController
            const payload = {
                ...req.body,
                equipmentId,
                laboratoryId: resolvedLaboratoryId,
            };

            newRecord = await PMS001Resolved.create(payload);

            console.log("🔍 newRecord._id:", newRecord?._id);
            console.log(
                "🔍 newRecord.equipmentId:",
                newRecord?.equipmentId
            );
        } catch (err) {
            console.error("💥 PMS001 create failed:", err);

            if (err?.code === 11000) {
                return next(
                    new CustomError(
                        `Duplicate PMS001: ${JSON.stringify(
                            err.keyValue || {}
                        )}`,
                        409
                    )
                );
            }

            if (err?.name === "ValidationError") {
                const details = Object.keys(err.errors || {}).reduce(
                    (acc, k) => {
                        acc[k] = err.errors[k].message;
                        return acc;
                    },
                    {}
                );
                return next(
                    new CustomError(
                        `PMS001 validation failed: ${JSON.stringify(
                            details
                        )}`,
                        400
                    )
                );
            }

            return next(
                new CustomError(
                    `Failed to create PMS001: ${err.message}`,
                    400
                )
            );
        }

        if (!newRecord || !newRecord._id) {
            return next(
                new CustomError(
                    "PMS001 created but returned no _id",
                    500
                )
            );
        }

        // ✅ Normalize equipmentId to ObjectId (para safe sa children)
        const equipmentIdValue = toObjectId(newRecord.equipmentId);
        const laboratoryIdValue = toObjectId(
            newRecord.laboratoryId || resolvedLaboratoryId
        );

        if (!equipmentIdValue) {
            return next(
                new CustomError(
                    "PMS001 created but equipmentId is not a valid ObjectId",
                    500
                )
            );
        }

        // ---------- 2. CREATE PMS002–PMS007 ----------
        const pmsModels = [
            { name: "PMS002", model: PMS002Model },
            { name: "PMS003", model: PMS003Model },
            { name: "PMS004", model: PMS004Model },
            { name: "PMS005", model: PMS005Model },
            { name: "PMS006", model: PMS006Model },
            { name: "PMS007", model: PMS007Model },
        ];

        const pmsResults = await Promise.allSettled(
            pmsModels.map(async ({ name, model }) => {
                const defaults = buildPmsDefaults(name, newRecord);

                const payload = {
                    pms001Id: newRecord._id,
                    equipmentId: equipmentIdValue,
                    laboratoryId: laboratoryIdValue,
                    ...defaults,
                };

                console.log(`📤 ${name} payload:`, payload);

                const doc = await model.create(payload);
                return { name, doc };
            })
        );

        // ---------- 3. COLLECT RESULTS ----------
        const pmsRecords = {};
        const pmsErrors = {};

        pmsResults.forEach((result, index) => {
            const { name } = pmsModels[index];

            if (result.status === "fulfilled") {
                pmsRecords[name] = result.value.doc;
                console.log(
                    `✅ ${name} created:`,
                    result.value.doc._id
                );
            } else {
                const err = result.reason;

                const errDetail = {
                    name: err?.name,
                    message: err?.message,
                    code: err?.code,
                    keyValue: err?.keyValue,
                    validation: err?.errors
                        ? Object.keys(err.errors).reduce((acc, k) => {
                              acc[k] = err.errors[k].message;
                              return acc;
                          }, {})
                        : undefined,
                };

                console.error(
                    `💥 ${name} create failed:`,
                    errDetail
                );

                pmsRecords[name] = null;
                pmsErrors[name] = errDetail;
            }
        });

        // ---------- 3b. ROLLBACK IF ALL FAILED ----------
        const allFailed = Object.values(pmsRecords).every(
            (v) => v === null
        );
        if (allFailed) {
            console.warn(
                "⚠️ All linked PMS records failed — rolling back PMS001"
            );
            try {
                await PMS001Resolved.findByIdAndDelete(newRecord._id);
            } catch (rbErr) {
                console.error("💥 Rollback failed:", rbErr);
            }

            return next(
                new CustomError(
                    "Failed to create any linked PMS records. PMS001 creation rolled back.",
                    500
                )
            );
        }

        // ---------- 4. POPULATE PMS001 (safe) ----------
        let populated = newRecord;
        try {
            if (
                newRecord &&
                typeof newRecord.populate === "function"
            ) {
                populated = await newRecord.populate("equipmentId");
            } else {
                populated = await PMS001Resolved.findById(
                    newRecord._id
                ).populate("equipmentId");
            }
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
exports.getAllPMS001 = AsyncErrorHandler(async (req, res) => {
    const records = await PMS001Resolved.find()
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

    const record = await PMS001Resolved.findById(
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
// GET BY EQUIPMENT ID
// ============================================================
exports.getPMS001ByEquipmentId = AsyncErrorHandler(
    async (req, res, next) => {
        const { equipmentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(equipmentId)) {
            return next(
                new CustomError("Invalid Equipment ID format", 400)
            );
        }

        const records = await PMS001Resolved.find({ equipmentId })
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

    const filteredBody = {};
    Object.keys(req.body).forEach((key) => {
        const value = req.body[key];
        if (value !== "" && value !== null && value !== undefined) {
            filteredBody[key] = value;
        }
    });

    if (
        filteredBody.equipmentId &&
        !mongoose.Types.ObjectId.isValid(filteredBody.equipmentId)
    ) {
        return next(
            new CustomError("Invalid Equipment ID format", 400)
        );
    }

    const updated = await PMS001Resolved.findByIdAndUpdate(
        req.params.id,
        filteredBody,
        { new: true, runValidators: true }
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
// DELETE — Remove PMS001 + auto-delete PMS002–PMS007
// ============================================================
exports.deletePMS001 = AsyncErrorHandler(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new CustomError("Invalid ID format", 400));
    }

    const { id } = req.params;

    const deleted = await PMS001Resolved.findByIdAndDelete(id);
    if (!deleted) {
        return next(new CustomError("PMS record not found", 404));
    }

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
        cascadeDeleted,
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

    const { from, to, all } = req.query;
    const showAll = all === "true" || all === "1";

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

    const pmsRecord = await PMS001Resolved.find({
        laboratoryId,
        ...dateFilter,
    })
        .populate("equipmentId")
        .sort({ createdAt: -1 });

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
// DISPLAY ALL PMS001 — with Encharge matching + optional date filter
// ============================================================
exports.DisplayAllPMS001 = AsyncErrorHandler(async (req, res, next) => {
    const userID = req.user._id;
    const role = req.user.role;

    console.log("triggerrr____ DisplayAllPMS001");

    let matchStage = {};

    if (role === "User") {
        const laboratory = await Laboratory.findOne({
            Encharge: userID,
        });

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

    const { from, to } = req.query;
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

    const pmsQuery = { ...dateFilter };

    if (laboratoryId) {
        pmsQuery.laboratoryId = laboratoryId;
    }

    const pmsRecord = await PMS001Resolved.find(pmsQuery)
        .populate("equipmentId")
        .sort({ createdAt: -1 });

    res.status(200).json({
        status: "success",
        role,
        pmsRecord,
        data: {
            _id: laboratoryId,
            LaboratoryName: laboratory[0].LaboratoryName,
        },
    });
});