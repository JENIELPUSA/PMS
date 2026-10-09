const AsyncErrorHandler = require("../Utils/AsyncErrorHandler");
const mongoose = require("mongoose");

const PMS001 = require("../Models/PMS001");
const PMS002 = require("../Models/PMS002");
const PMS003 = require("../Models/PMS003");
const PMS004 = require("../Models/PMS004");
const PMS005 = require("../Models/PMS005");
const PMS006 = require("../Models/PMS006");

const Laboratory = require("../Models/Laboratory");

// ============================================================
// REGISTRY
// ============================================================
const PMS_MODELS = {
    PMS001,
    PMS002,
    PMS003,
    PMS004,
    PMS005,
    PMS006,
};

const PMS_KEYS_ALL = Object.keys(PMS_MODELS);

// ✅ Date field per PMS
const DATE_FIELD_MAP = {
    PMS001: "createdAt",
    PMS002: "createdAt",
    PMS003: "date",
    PMS004: "createdAt",
    PMS005: "Date",
    PMS006: "maintenanceDate",
};

// ✅ Fields na kukunin mula sa Equipment model
const EQUIPMENT_SELECT =
    "code Brand SerialNumber Specification status Category remarks DateAcquired";

// ============================================================
// HELPERS
// ============================================================

function toPHDate(rawDate) {
    return new Date(new Date(rawDate).getTime() + 8 * 3600 * 1000);
}

function buildMonthlyTracking(records, dateField = "createdAt") {
    const map = {};
    for (const rec of records) {
        const rawDate = rec[dateField] || rec.createdAt;
        if (!rawDate) continue;
        const month = toPHDate(rawDate).toISOString().slice(0, 7);
        map[month] = (map[month] || 0) + 1;
    }
    return Object.entries(map)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));
}

function getAllMonths(monthlyData) {
    const set = new Set();
    for (const arr of Object.values(monthlyData)) {
        for (const item of arr) set.add(item.month);
    }
    return Array.from(set).sort();
}

function resolveEquipment(eq, fallbackId = "unknown") {
    const eqId = eq?._id?.toString() || fallbackId;
    const displayName =
        eq?.Brand && eq?.code
            ? `${eq.Brand} (${eq.code})`
            : eq?.Brand ||
              eq?.code ||
              eq?.SerialNumber ||
              eq?.Specification ||
              eqId;

    return {
        equipmentId: eqId,
        name: displayName,
        brand: eq?.Brand || "",
        code: eq?.code || "",
        serialNumber: eq?.SerialNumber || "",
        specification: eq?.Specification || "",
        status: eq?.status || "",
    };
}

function countByEquipment(records) {
    const map = {};
    for (const rec of records) {
        const eq = resolveEquipment(rec.equipmentId);
        if (!map[eq.equipmentId]) {
            map[eq.equipmentId] = { ...eq, count: 0 };
        }
        map[eq.equipmentId].count += 1;
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
}

function countByField(records, field, limit = 10) {
    const map = {};
    for (const rec of records) {
        const raw = rec[field];
        let val = "";
        if (typeof raw === "string") val = raw.trim();
        else if (raw != null) val = String(raw).trim();
        if (!val) continue;
        map[val] = (map[val] || 0) + 1;
    }
    return Object.entries(map)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

function buildBooleanBreakdown(records, fields) {
    return fields.map((field) => ({
        field,
        count: records.filter((r) => r[field] === true).length,
    }));
}

function buildPieChartForPms(pmsKey, records) {
    const pie = { labels: [], data: [], percentages: [] };
    const total = records.length;

    const addSlice = (label, count) => {
        pie.labels.push(label);
        pie.data.push(count);
    };

    if (pmsKey === "PMS001") {
        addSlice("Serviceable", records.filter((r) => r.serviceable === true).length);
        addSlice("Non-Serviceable", records.filter((r) => r.nonServiceable === true).length);
        addSlice("Available (Yes)", records.filter((r) => r.availYes === true).length);
        addSlice("Available (No)", records.filter((r) => r.availNo === true).length);
    } else if (pmsKey === "PMS002" || pmsKey === "PMS003") {
        const fields = [
            "lubrication", "overhauling", "minorAdjustment",
            "replaceWornOutParts", "repair", "generalRecondition", "repairPart",
        ];
        for (const f of fields) {
            addSlice(f, records.filter((r) => r[f] === true).length);
        }
    } else if (pmsKey === "PMS004") {
        const fields = ["routineInspection", "lubrication", "minorAdjustment", "repair"];
        for (const f of fields) {
            addSlice(f, records.filter((r) => r[f] === true).length);
        }
    } else if (pmsKey === "PMS005") {
        const topProblems = countByField(records, "Problem_Encounter", 5);
        for (const p of topProblems) addSlice(p.label, p.count);
    } else if (pmsKey === "PMS006") {
        const topTroubles = countByField(records, "analysisTrouble", 5);
        for (const t of topTroubles) addSlice(t.label, t.count);
    }

    const sliceSum = pie.data.reduce((s, v) => s + v, 0);
    if (sliceSum < total) addSlice("Unknown", total - sliceSum);

    const totalSlices = pie.data.reduce((s, v) => s + v, 0) || 1;
    pie.percentages = pie.data.map((v) =>
        Number(((v / totalSlices) * 100).toFixed(2))
    );
    pie.total = total;
    return pie;
}

function buildBarChartForPms(records) {
    const map = {};
    for (const rec of records) {
        const eq = resolveEquipment(rec.equipmentId);
        if (!eq.equipmentId || eq.equipmentId === "unknown") continue;

        if (!map[eq.equipmentId]) {
            map[eq.equipmentId] = {
                equipmentId: eq.equipmentId,
                name: eq.name,
                code: eq.code,
                brand: eq.brand,
                total: 0,
            };
        }
        map[eq.equipmentId].total += 1;
    }

    const sorted = Object.values(map)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    return {
        labels: sorted.map((e) => e.name),
        data: sorted.map((e) => e.total),
        meta: sorted.map((e) => ({
            equipmentId: e.equipmentId,
            code: e.code,
            brand: e.brand,
        })),
    };
}

// ============================================================
// 🆕 MAINTENANCE TYPE BAR BUILDER (para sa PMS002/PMS003/PMS004)
// ============================================================
function buildMaintenanceTypeBar(records, fields) {
    const data = fields.map(
        (field) => records.filter((r) => r[field] === true).length
    );

    const mostUsed = (() => {
        const max = Math.max(...data, 0);
        if (max === 0) return null;
        const idx = data.indexOf(max);
        return { label: fields[idx], count: max };
    })();

    const leastUsed = (() => {
        if (data.length === 0) return null;
        const min = Math.min(...data);
        const idx = data.indexOf(min);
        return { label: fields[idx], count: min };
    })();

    return {
        labels: fields,
        data,
        total: records.length,
        mostUsed,
        leastUsed,
        byEquipment: records.map((rec) => {
            const eq = resolveEquipment(rec.equipmentId);
            return {
                equipmentId: eq.equipmentId,
                name: eq.name,
                types: fields.reduce((acc, field) => {
                    if (rec[field] === true) acc[field] = true;
                    return acc;
                }, {}),
            };
        }),
    };
}

// ============================================================
// MAIN CONTROLLER
// ============================================================
exports.FindStatistical = AsyncErrorHandler(async (req, res) => {
    // 0️⃣ Validate user
    const userId = req.user?._id;
    if (!userId) {
        return res.status(400).json({
            status: "fail",
            message: "User ID not found in request.",
        });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1️⃣ Hanapin ang Laboratory
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
    const laboratoryName = laboratory[0].LaboratoryName;

    // 2️⃣ Kunin LAHAT ng PMS records — with Equipment populate
    const results = await Promise.all(
        Object.entries(PMS_MODELS).map(async ([key, Model]) => {
            try {
                const records = await Model.find({ laboratoryId })
                    .populate("equipmentId", EQUIPMENT_SELECT)
                    .sort({ createdAt: -1 })
                    .lean();
                return [key, records];
            } catch (err) {
                console.error(`❌ [ERROR] ${key}:`, err.message);
                return [key, []];
            }
        })
    );

    const pmsResults = Object.fromEntries(results);

    // ============================================================
    // 3️⃣ OVERALL PIE CHART
    // ============================================================
    const pieChart = { labels: [], data: [], percentages: [] };
    const totalAllRecords = Object.values(pmsResults).reduce(
        (sum, recs) => sum + recs.length,
        0
    );

    for (const [key, records] of Object.entries(pmsResults)) {
        pieChart.labels.push(key);
        pieChart.data.push(records.length);
        pieChart.percentages.push(
            totalAllRecords > 0
                ? Number(((records.length / totalAllRecords) * 100).toFixed(2))
                : 0
        );
    }

    // ============================================================
    // 4️⃣ OVERALL BAR CHART
    // ============================================================
    const equipmentBarMap = {};
    for (const [key, records] of Object.entries(pmsResults)) {
        for (const rec of records) {
            const eq = resolveEquipment(rec.equipmentId);
            if (!eq.equipmentId || eq.equipmentId === "unknown") continue;

            if (!equipmentBarMap[eq.equipmentId]) {
                equipmentBarMap[eq.equipmentId] = {
                    equipmentId: eq.equipmentId,
                    name: eq.name,
                    code: eq.code,
                    brand: eq.brand,
                    total: 0,
                    perPms: {},
                };
            }
            equipmentBarMap[eq.equipmentId].total += 1;
            equipmentBarMap[eq.equipmentId].perPms[key] =
                (equipmentBarMap[eq.equipmentId].perPms[key] || 0) + 1;
        }
    }

    const top10EquipmentBar = Object.values(equipmentBarMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    const barChart = {
        labels: top10EquipmentBar.map((e) => e.name),
        data: top10EquipmentBar.map((e) => e.total),
        perPms: top10EquipmentBar.map((e) => e.perPms),
        meta: top10EquipmentBar.map((e) => ({
            equipmentId: e.equipmentId,
            code: e.code,
            brand: e.brand,
        })),
    };

    // ============================================================
    // 5️⃣ LINE GRAPH
    // ============================================================
    const dailyCounts = {};
    for (const [key, records] of Object.entries(pmsResults)) {
        const dateField = DATE_FIELD_MAP[key] || "createdAt";
        for (const rec of records) {
            const rawDate = rec[dateField] || rec.createdAt;
            if (!rawDate) continue;
            const day = toPHDate(rawDate).toISOString().slice(0, 10);
            if (!dailyCounts[day]) dailyCounts[day] = {};
            dailyCounts[day][key] = (dailyCounts[day][key] || 0) + 1;
        }
    }

    const sortedDays = Object.keys(dailyCounts).sort().slice(-30);
    const lineGraph = {
        labels: sortedDays,
        datasets: PMS_KEYS_ALL.map((key) => ({
            label: key,
            data: sortedDays.map((day) => dailyCounts[day]?.[key] || 0),
        })),
    };

    // ============================================================
    // 6️⃣ MONTHLY TRACKING
    // ============================================================
    const monthlyPerPms = {};
    for (const [key, records] of Object.entries(pmsResults)) {
        const dateField = DATE_FIELD_MAP[key] || "createdAt";
        monthlyPerPms[key] = buildMonthlyTracking(records, dateField);
    }

    const allMonths = getAllMonths(monthlyPerPms);

    const monthlyCombined = allMonths.map((month) => {
        const row = { month };
        let total = 0;
        for (const key of PMS_KEYS_ALL) {
            const count =
                monthlyPerPms[key]?.find((m) => m.month === month)?.count || 0;
            row[key] = count;
            total += count;
        }
        row.total = total;
        return row;
    });

    const monthlyTotals = PMS_KEYS_ALL.map((key) => ({
        pms: key,
        total: monthlyPerPms[key]?.reduce((sum, m) => sum + m.count, 0) || 0,
    }));

    const monthlyTracking = {
        months: allMonths,
        combined: monthlyCombined,
        perPms: monthlyPerPms,
        totals: monthlyTotals,
    };

    const stackedMonthlyChart = {
        labels: allMonths,
        datasets: PMS_KEYS_ALL.map((key) => ({
            label: key,
            data: allMonths.map(
                (month) =>
                    monthlyPerPms[key]?.find((m) => m.month === month)?.count || 0
            ),
        })),
        totals: allMonths.map(
            (month) =>
                monthlyCombined.find((r) => r.month === month)?.total || 0
        ),
    };

    // ============================================================
    // 7️⃣ MAINTENANCE FIELDS CONSTANTS
    // ============================================================
    const MAINTENANCE_7_FIELDS = [
        "lubrication",
        "overhauling",
        "minorAdjustment",
        "replaceWornOutParts",
        "repair",
        "generalRecondition",
        "repairPart",
    ];

    const PMS004_FIELDS = [
        "routineInspection",
        "lubrication",
        "minorAdjustment",
        "repair",
    ];

    // ============================================================
    // 8️⃣ PER-PMS PIE CHARTS
    // ============================================================
    const pieChartsPerPms = {};
    for (const [key, records] of Object.entries(pmsResults)) {
        pieChartsPerPms[key] = buildPieChartForPms(key, records);
    }

    // ============================================================
    // 9️⃣ PER-PMS BAR CHARTS
    // ============================================================
    const barChartsPerPms = {};
    for (const [key, records] of Object.entries(pmsResults)) {
        barChartsPerPms[key] = buildBarChartForPms(records);
    }

    // ============================================================
    // 🔟 PMS001 REPRESENTATION
    // ============================================================
    const pms001Records = pmsResults.PMS001 || [];
    const pms001Representation = {
        total: pms001Records.length,
        serviceable: pms001Records.filter((r) => r.serviceable === true).length,
        nonServiceable: pms001Records.filter(
            (r) => r.nonServiceable === true
        ).length,
        availYes: pms001Records.filter((r) => r.availYes === true).length,
        availNo: pms001Records.filter((r) => r.availNo === true).length,
        byType: countByField(pms001Records, "type", 10),
        byEquipment: countByEquipment(pms001Records),
        byMonth: buildMonthlyTracking(pms001Records, "createdAt"),
    };

    // ============================================================
    // 🆕 PMS001 SERVICEABLE vs NON-SERVICEABLE PIE
    // ============================================================
    const serviceableCount = pms001Records.filter(
        (r) => r.serviceable === true
    ).length;
    const nonServiceableCount = pms001Records.filter(
        (r) => r.nonServiceable === true
    ).length;
    const pms001ServiceableTotal = serviceableCount + nonServiceableCount;

    const pms001ServiceablePie = {
        labels: ["Serviceable", "Non-Serviceable"],
        data: [serviceableCount, nonServiceableCount],
        percentages:
            pms001ServiceableTotal > 0
                ? [
                      Number(
                          ((serviceableCount / pms001ServiceableTotal) * 100).toFixed(2)
                      ),
                      Number(
                          ((nonServiceableCount / pms001ServiceableTotal) * 100).toFixed(2)
                      ),
                  ]
                : [0, 0],
        total: pms001ServiceableTotal,
        unknownCount:
            pms001Records.length - pms001ServiceableTotal > 0
                ? pms001Records.length - pms001ServiceableTotal
                : 0,
        grandTotal: pms001Records.length,
    };

    // ============================================================
    // 1️⃣1️⃣ PMS002 REPRESENTATION
    // ============================================================
    const pms002Records = pmsResults.PMS002 || [];
    const pms002Representation = {
        total: pms002Records.length,
        byMaintenanceType: buildBooleanBreakdown(
            pms002Records,
            MAINTENANCE_7_FIELDS
        ),
        byRoutineInspection: countByField(
            pms002Records,
            "routineInspection"
        ),
        byEquipment: countByEquipment(pms002Records),
        remarksStats: {
            withRemarks: pms002Records.filter(
                (r) => r.remarks && r.remarks.trim() !== ""
            ).length,
            withoutRemarks: pms002Records.filter(
                (r) => !r.remarks || r.remarks.trim() === ""
            ).length,
        },
        byMonth: buildMonthlyTracking(pms002Records, "createdAt"),
    };

    // ============================================================
    // 🆕 PMS002 MAINTENANCE TYPE BAR CHART
    // ============================================================
    const pms002MaintenanceBar = buildMaintenanceTypeBar(
        pms002Records,
        MAINTENANCE_7_FIELDS
    );

    // ============================================================
    // 1️⃣2️⃣ PMS003 REPRESENTATION
    // ============================================================
    const pms003Records = pmsResults.PMS003 || [];
    const pms003Representation = {
        total: pms003Records.length,
        byMaintenanceType: buildBooleanBreakdown(
            pms003Records,
            MAINTENANCE_7_FIELDS
        ),
        byRoutineInspection: countByField(
            pms003Records,
            "routineInspection"
        ),
        byEquipment: countByEquipment(pms003Records),
        byMonth: buildMonthlyTracking(pms003Records, "date"),
    };

    // ============================================================
    // 🆕 PMS003 MAINTENANCE TYPE BAR CHART
    // ============================================================
    const pms003MaintenanceBar = buildMaintenanceTypeBar(
        pms003Records,
        MAINTENANCE_7_FIELDS
    );

    // ============================================================
    // 1️⃣3️⃣ PMS004 REPRESENTATION
    // ============================================================
    const pms004Records = pmsResults.PMS004 || [];
    const pms004Representation = {
        total: pms004Records.length,
        byType: buildBooleanBreakdown(pms004Records, PMS004_FIELDS),
        byEquipment: countByEquipment(pms004Records),
        maintenanceStats: {
            withMaintenance: pms004Records.filter((r) =>
                PMS004_FIELDS.some((f) => r[f] === true)
            ).length,
            withoutMaintenance: pms004Records.filter((r) =>
                PMS004_FIELDS.every((f) => r[f] !== true)
            ).length,
        },
        byMonth: buildMonthlyTracking(pms004Records, "createdAt"),
    };

    // ============================================================
    // 🆕 PMS004 MAINTENANCE TYPE BAR CHART
    // ============================================================
    const pms004MaintenanceBar = buildMaintenanceTypeBar(
        pms004Records,
        PMS004_FIELDS
    );

    // ============================================================
    // 1️⃣4️⃣ PMS005 REPRESENTATION
    // ============================================================
    const pms005Records = pmsResults.PMS005 || [];
    const pms005Representation = {
        total: pms005Records.length,
        topProblems: countByField(pms005Records, "Problem_Encounter", 10),
        topSpareParts: countByField(pms005Records, "Spare_Parts", 10),
        byEquipment: countByEquipment(pms005Records),
        byMonth: buildMonthlyTracking(pms005Records, "Date"),
    };

    // ============================================================
    // 1️⃣5️⃣ PMS006 REPRESENTATION
    // ============================================================
    const pms006Records = pmsResults.PMS006 || [];
    const pms006Representation = {
        total: pms006Records.length,
        topIncharge: (() => {
            const map = {};
            for (const rec of pms006Records) {
                const val =
                    (rec.incharge || "").trim() ||
                    (rec.performedByFullName || "").trim();
                if (!val) continue;
                map[val] = (map[val] || 0) + 1;
            }
            return Object.entries(map)
                .map(([label, count]) => ({ label, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
        })(),
        topTroubles: countByField(pms006Records, "analysisTrouble", 10),
        topSpareParts: countByField(
            pms006Records,
            "sparePartsMaterialsUsed",
            10
        ),
        byEquipment: countByEquipment(pms006Records),
        byMonth: buildMonthlyTracking(pms006Records, "maintenanceDate"),
        uniquePerformers: (() => {
            const set = new Set();
            for (const rec of pms006Records) {
                const val =
                    (rec.incharge || "").trim() ||
                    (rec.performedByFullName || "").trim() ||
                    rec.performedBy?.toString();
                if (val) set.add(val);
            }
            return set.size;
        })(),
    };

    // ============================================================
    // 1️⃣6️⃣ EQUIPMENT COVERAGE ANALYSIS
    // ============================================================
    const uniqueEquipmentPerPms = {};
    for (const [key, records] of Object.entries(pmsResults)) {
        const set = new Set();
        for (const rec of records) {
            const eqId = rec.equipmentId?._id?.toString();
            if (eqId) set.add(eqId);
        }
        uniqueEquipmentPerPms[key] = {
            count: set.size,
            equipmentIds: Array.from(set),
        };
    }

    const rankedByEquipmentCoverage = Object.entries(uniqueEquipmentPerPms)
        .map(([pms, data]) => ({ pms, uniqueEquipment: data.count }))
        .sort((a, b) => b.uniqueEquipment - a.uniqueEquipment);

    const topPmsByEquipment =
        rankedByEquipmentCoverage[0]?.uniqueEquipment > 0
            ? rankedByEquipmentCoverage[0]
            : null;

    const equipmentCoverageMap = {};
    for (const [key, records] of Object.entries(pmsResults)) {
        for (const rec of records) {
            const eq = resolveEquipment(rec.equipmentId);
            if (!eq.equipmentId || eq.equipmentId === "unknown") continue;

            if (!equipmentCoverageMap[eq.equipmentId]) {
                equipmentCoverageMap[eq.equipmentId] = {
                    ...eq,
                    pmsCovered: new Set(),
                    totalRecords: 0,
                };
            }
            equipmentCoverageMap[eq.equipmentId].pmsCovered.add(key);
            equipmentCoverageMap[eq.equipmentId].totalRecords += 1;
        }
    }

    const equipmentCoverage = Object.values(equipmentCoverageMap)
        .map((eq) => ({
            equipmentId: eq.equipmentId,
            name: eq.name,
            brand: eq.brand,
            code: eq.code,
            serialNumber: eq.serialNumber,
            specification: eq.specification,
            status: eq.status,
            pmsCovered: Array.from(eq.pmsCovered).sort(),
            pmsCount: eq.pmsCovered.size,
            totalRecords: eq.totalRecords,
        }))
        .sort((a, b) => {
            if (b.pmsCount !== a.pmsCount) return b.pmsCount - a.pmsCount;
            return b.totalRecords - a.totalRecords;
        });

    const fullyCoveredEquipment = equipmentCoverage.filter(
        (eq) => eq.pmsCount === PMS_KEYS_ALL.length
    );

    const crossCoveredEquipment = equipmentCoverage.filter(
        (eq) => eq.pmsCount >= 2
    );

    const equipmentCoverageSummary = {
        rankedByPms: rankedByEquipmentCoverage,
        topPms: topPmsByEquipment,
        uniquePerPms: Object.fromEntries(
            Object.entries(uniqueEquipmentPerPms).map(([k, v]) => [k, v.count])
        ),
        totalUniqueEquipment: Object.keys(equipmentCoverageMap).length,
        fullyCoveredEquipment: fullyCoveredEquipment.map((eq) => ({
            equipmentId: eq.equipmentId,
            name: eq.name,
            brand: eq.brand,
            code: eq.code,
            serialNumber: eq.serialNumber,
            totalRecords: eq.totalRecords,
        })),
        crossCoveredEquipment: crossCoveredEquipment.map((eq) => ({
            equipmentId: eq.equipmentId,
            name: eq.name,
            brand: eq.brand,
            code: eq.code,
            serialNumber: eq.serialNumber,
            pmsCovered: eq.pmsCovered,
            pmsCount: eq.pmsCount,
            totalRecords: eq.totalRecords,
        })),
        allEquipmentCoverage: equipmentCoverage.slice(0, 20),
    };

    // ============================================================
    // 1️⃣7️⃣ TOP 10 EQUIPMENT (Overall)
    // ============================================================
    const overallEquipmentMap = {};

    for (const [key, records] of Object.entries(pmsResults)) {
        for (const rec of records) {
            const eq = resolveEquipment(rec.equipmentId);
            if (!eq.equipmentId || eq.equipmentId === "unknown") continue;

            if (!overallEquipmentMap[eq.equipmentId]) {
                overallEquipmentMap[eq.equipmentId] = {
                    ...eq,
                    totalRecords: 0,
                    perPms: {},
                };
            }

            overallEquipmentMap[eq.equipmentId].totalRecords += 1;
            overallEquipmentMap[eq.equipmentId].perPms[key] =
                (overallEquipmentMap[eq.equipmentId].perPms[key] || 0) + 1;
        }
    }

    const top10Equipment = Object.values(overallEquipmentMap)
        .sort((a, b) => b.totalRecords - a.totalRecords)
        .slice(0, 10)
        .map((eq, idx) => ({
            rank: idx + 1,
            equipmentId: eq.equipmentId,
            name: eq.name,
            brand: eq.brand,
            code: eq.code,
            serialNumber: eq.serialNumber,
            specification: eq.specification,
            status: eq.status,
            totalRecords: eq.totalRecords,
            perPms: eq.perPms,
            pmsCovered: Object.keys(eq.perPms).sort(),
            pmsCount: Object.keys(eq.perPms).length,
        }));

    const top10EquipmentSummary = {
        top10: top10Equipment,
        totalEquipmentTracked: Object.keys(overallEquipmentMap).length,
    };

    // ============================================================
    // 1️⃣8️⃣ RESPONSE
    // ============================================================
    res.status(200).json({
        status: "success",
        pmsKeys: PMS_KEYS_ALL,

        // Overall Charts
        pieChart,
        barChart,
        lineGraph,
        stackedMonthlyChart,
        monthlyTracking,

        // PMS-specific charts
        pms001ServiceablePie,
        pms002MaintenanceBar,   // 🆕
        pms003MaintenanceBar,   // 🆕
        pms004MaintenanceBar,   // 🆕

        // Per-PMS Charts
        pieChartsPerPms,
        barChartsPerPms,

        // PMS Representations
        pms001Representation,
        pms002Representation,
        pms003Representation,
        pms004Representation,
        pms005Representation,
        pms006Representation,

        // Equipment Analysis
        equipmentCoverage: equipmentCoverageSummary,
        top10Equipment: top10EquipmentSummary,

        // Laboratory Info
        data: {
            _id: laboratoryId,
            LaboratoryName: laboratoryName,
        },
    });
});