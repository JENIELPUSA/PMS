const AsyncErrorHandler = require("../Utils/AsyncErrorHandler");
const mongoose = require("mongoose");
const CustomError = require("../Utils/CustomError");
const PMS002 = require("../Models/PMS002");
const Equipment = require("../Models/Equipment");
const Laboratory = require("../Models/Laboratory");
const PMS001 = require("../Models/PMS001");

// ============================================================
// HELPER — Extract pms002 fields (kasama ang pmsNo)
// ============================================================
const extractPMS002 = (pms002Record) => {
    if (!pms002Record) return null;

    return {
        _id: pms002Record._id,
        pmsNo: pms002Record.pmsNo || 0,        // ✅ IDAGDAG
        routineInspection: pms002Record.routineInspection || "",
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
// FIND BY EQUIPMENT — Isang row per PMS001 record
// ============================================================
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
                },
            });
        }

        // 3️⃣ Date filter
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

        // 4️⃣ PMS002 records
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

        // 5️⃣ PMS001 records — LAHAT
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

        // 6️⃣ GROUP PMS002 by equipmentId
        const pms002Map = new Map();

        pmsRecords.forEach((pms002Record) => {
            if (!pms002Record.equipmentId) return;

            const eqId = pms002Record.equipmentId._id
                ? pms002Record.equipmentId._id.toString()
                : pms002Record.equipmentId.toString();

            if (!pms002Map.has(eqId)) pms002Map.set(eqId, []);
            pms002Map.get(eqId).push(pms002Record);
        });

        // 7️⃣ MERGE: isang row per PMS001 record
        const merged = pms001Records.map((pms001Record) => {
            const eqId = pms001Record.equipmentId?._id
                ? pms001Record.equipmentId._id.toString()
                : pms001Record.equipmentId?.toString() || null;

            const pms002List = eqId
                ? pms002Map.get(eqId) || []
                : [];

            const latestPMS002 = pms002List[0] || null;

            const eq = pms001Record.equipmentId || {};

            const equipment = eq._id
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
                : null;

            return {
                equipment,

                // PMS001 block
                pms001: {
                    _id: pms001Record._id,
                    code: pms001Record.equipmentId?.code || "N/A",
                    equipmentName: pms001Record.equipmentId
                        ? `${
                              pms001Record.equipmentId.Brand || ""
                          } ${
                              pms001Record.equipmentId.Specification ||
                              ""
                          }`.trim() || "N/A"
                        : "N/A",
                    DateAcquired:
                        pms001Record.equipmentId?.DateAcquired ||
                        null,

                    serviceable: pms001Record.serviceable ?? false,
                    nonServiceable:
                        pms001Record.nonServiceable ?? false,
                    type: pms001Record.type || "N/A",
                    breakdownNo: pms001Record.breakdownNo || "0",
                    breakdownDuration:
                        pms001Record.breakdownDuration || "N/A",
                    availYes: pms001Record.availYes ?? false,
                    availNo: pms001Record.availNo ?? false,
                    remarks: pms001Record.remarks || "",
                    createdAt: pms001Record.createdAt,
                },

                // ✅ PMS002 block — kasama ang pmsNo
                pms002: extractPMS002(latestPMS002),

                // Flags
                hasPMS001: true,
                hasPMS002: pms002List.length > 0,
                pms002Count: pms002List.length,

                latestActivityAt:
                    pms001Record.createdAt ||
                    latestPMS002?.createdAt ||
                    null,
            };
        });

        // 8️⃣ Sort
        merged.sort((a, b) => {
            const aDate = a.pms001?.createdAt || 0;
            const bDate = b.pms001?.createdAt || 0;
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

// ============================================================
// CREATE — Add new PMS002 record (pmsNo auto-increment)
// ============================================================
exports.createPMS002 = AsyncErrorHandler(async (req, res, next) => {
    const { equipmentId } = req.body;

    console.log("BODY", req.body);

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

    // ✅ pmsNo ay auto-generated sa pre("save") hook
    const newRecord = await PMS002.create(req.body);

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
// GET ALL — List all PMS002 records
// ============================================================
exports.getAllPMS002 = AsyncErrorHandler(async (req, res, next) => {
    const records = await PMS002.find()
        .populate("equipmentId")
        .sort({ pmsNo: -1 }) // ✅ sort by pmsNo (newest first)
        .lean();

    res.status(200).json({
        status: "success",
        totalRecords: records.length,
        data: records.map((rec) => ({
            ...rec,
            pmsNo: rec.pmsNo || 0,             // ✅ ensure pmsNo may value
        })),
    });
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
            pmsNo: record.pmsNo || 0,          // ✅ ensure pmsNo
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
            .sort({ pmsNo: -1 })               // ✅ sort by pmsNo
            .lean();

        res.status(200).json({
            status: "success",
            totalRecords: records.length,
            data: records.map((rec) => ({
                ...rec,
                pmsNo: rec.pmsNo || 0,         // ✅ ensure pmsNo
            })),
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

    // ✅ Iwasan ma-update ang pmsNo
    const filteredBody = {};
    Object.keys(req.body).forEach((key) => {
        if (key === "pmsNo") return; // ❌ skip pmsNo
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

    const updated = await PMS002.findByIdAndUpdate(
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
        data: {
            ...updated.toObject(),
            pmsNo: updated.pmsNo || 0,          // ✅ ensure pmsNo
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
// DISPLAY ALL PMS002 — Isang row per PMS002 record
// ============================================================
exports.DisplayAllPMS002 = AsyncErrorHandler(async (req, res) => {
    try {
        // 1. Laboratory
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

        // 2. Date filter
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

        // 3. PMS002 records — SORTED by pmsNo then createdAt
        const pmsRecords = await PMS002.find(dateFilter)
            .populate(
                "equipmentId",
                "code Brand DateAcquired SerialNumber Specification status remarks Category"
            )
            .sort({ pmsNo: -1, createdAt: -1 }) // ✅ tiebreaker
            .lean();

        // 4. PMS001 records — SORTED by createdAt desc (latest first)
        const pms001Records = await PMS001.find({})
            .populate(
                "equipmentId",
                "code Brand DateAcquired SerialNumber Specification"
            )
            .sort({ createdAt: -1 })
            .lean();

        console.log("🔍 PMS002 count:", pmsRecords.length);
        console.log("🔍 PMS001 count:", pms001Records.length);

        // 5. GROUP PMS001 by equipmentId (para maging lookup map)
        const pms001Map = new Map();

        pms001Records.forEach((pms001) => {
            if (!pms001.equipmentId) return;

            const rawId = pms001.equipmentId._id || pms001.equipmentId;
            const eqId = rawId.toString();

            if (!pms001Map.has(eqId)) pms001Map.set(eqId, []);

            pms001Map.get(eqId).push({
                _id: pms001._id,
                code: pms001.equipmentId.code || "N/A",
                equipmentName:
                    [
                        pms001.equipmentId.Brand,
                        pms001.equipmentId.Specification,
                    ]
                        .filter(Boolean)
                        .join(" ") || "N/A",
                DateAcquired: pms001.equipmentId.DateAcquired || null,

                serviceable: pms001.serviceable ?? false,
                nonServiceable: pms001.nonServiceable ?? false,
                type: pms001.type || "N/A",
                breakdownNo: pms001.breakdownNo || "0",
                breakdownDuration: pms001.breakdownDuration || "N/A",
                availYes: pms001.availYes ?? false,
                availNo: pms001.availNo ?? false,
                remarks: pms001.remarks || "",
                createdAt: pms001.createdAt,
            });
        });

        // 6. Helper — i-build ang pms001 block mula sa latest record
        const buildPms001Block = (latestPMS001, equipment) => {
            if (latestPMS001) {
                return {
                    code: latestPMS001.code,
                    equipmentName: latestPMS001.equipmentName,
                    DateAcquired: latestPMS001.DateAcquired,
                    serviceable: latestPMS001.serviceable,
                    nonServiceable: latestPMS001.nonServiceable,
                    type: latestPMS001.type,
                    breakdownNo: latestPMS001.breakdownNo,
                    breakdownDuration: latestPMS001.breakdownDuration,
                    availYes: latestPMS001.availYes,
                    availNo: latestPMS001.availNo,
                    remarks: latestPMS001.remarks,
                };
            }
            return {
                code: equipment?.code || "N/A",
                equipmentName: equipment
                    ? `${equipment.Brand || ""} ${equipment.Specification || ""}`
                          .trim() || "N/A"
                    : "N/A",
                DateAcquired: equipment?.DateAcquired || null,
            };
        };

        // 7. Build equipment object mula sa populated data
        const buildEquipment = (sourceEquip) => {
            if (!sourceEquip || !sourceEquip._id) return null;
            return {
                _id: sourceEquip._id,
                code: sourceEquip.code || "N/A",
                Brand: sourceEquip.Brand || "N/A",
                DateAcquired: sourceEquip.DateAcquired || null,
                SerialNumber: sourceEquip.SerialNumber || "N/A",
                Specification: sourceEquip.Specification || "N/A",
                status: sourceEquip.status || "N/A",
                remarks: sourceEquip.remarks || "",
                Category: sourceEquip.Category || null,
            };
        };

        // 8. MERGE: isang row PER PMS002 record
        const merged = [];
        const pms002EquipmentIds = new Set();

        for (const pms002 of pmsRecords) {
            const sourceEquip = pms002.equipmentId;
            if (!sourceEquip) continue;

            const eqId = sourceEquip._id
                ? sourceEquip._id.toString()
                : sourceEquip.toString();

            pms002EquipmentIds.add(eqId);

            const pms001List = pms001Map.get(eqId) || [];
            const latestPMS001 = pms001List[0] || null;
            const equipment = buildEquipment(sourceEquip);

            merged.push({
                ...pms002,
                equipmentId: eqId,
                equipment,

                // PMS001 block (latest reference lang)
                pms001: buildPms001Block(latestPMS001, equipment),

                // PMS002 block
                pms002: extractPMS002(pms002),

                // History arrays
                pms001History: pms001List,

                // Flags
                hasPMS001: pms001List.length > 0,
                hasPMS002: true,
                pms001Count: pms001List.length,
                pms002Count: 1,

                latestActivityAt:
                    pms002.createdAt || latestPMS001?.createdAt || null,
            });
        }

        // 9. Optional: isama rin ang equipment na may PMS001 pero WALANG PMS002
        //    (para hindi mawala sa display — naka-flag lang na hasPMS002: false)
        for (const [eqId, pms001List] of pms001Map.entries()) {
            if (pms002EquipmentIds.has(eqId)) continue;

            const latestPMS001 = pms001List[0] || null;

            // Kunin ang equipment info mula sa PMS001 populated data
            const rawPms001 =
                pms001Records.find(
                    (p) =>
                        ((p.equipmentId?._id || p.equipmentId) || "").toString() ===
                        eqId
                ) || null;
            const equipment = buildEquipment(rawPms001?.equipmentId);

            merged.push({
                _id: null, // walang PMS002
                equipmentId: eqId,
                equipment,

                pms001: buildPms001Block(latestPMS001, equipment),
                pms002: null,

                pms001History: pms001List,

                hasPMS001: true,
                hasPMS002: false,
                pms001Count: pms001List.length,
                pms002Count: 0,

                latestActivityAt: latestPMS001?.createdAt || null,
            });
        }

        // 10. Sort — latest activity first
        merged.sort((a, b) => {
            const aDate = a.latestActivityAt || 0;
            const bDate = b.latestActivityAt || 0;
            return new Date(bDate) - new Date(aDate);
        });

        console.log("🔍 merged.length:", merged.length);

        // 11. Response
        return res.status(200).json({
            status: "success",
            pmsRecord002: merged,
            totalPMS002: pmsRecords.length,
            totalPMS001: pms001Records.length,
            totalMergedRecords: merged.length,
            data: {
                _id: laboratory[0]._id,
                LaboratoryName: laboratory[0].LaboratoryName,
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