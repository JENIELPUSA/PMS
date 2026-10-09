import { motion } from "framer-motion";
import {
    FaChartPie,
    FaChartLine,
    FaCalendarAlt,
    FaDesktop,
} from "react-icons/fa";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  DUMMY DATA                                                         */
/* ------------------------------------------------------------------ */
const dummyData = {
    status: "success",
    pmsKeys: ["PMS001", "PMS002", "PMS003", "PMS004", "PMS005", "PMS006"],

    pieChart: {
        labels: ["PMS001", "PMS002", "PMS003", "PMS004", "PMS005", "PMS006"],
        data: [5, 4, 2, 1, 5, 0],
        percentages: [29.41, 23.53, 11.76, 5.88, 29.41, 0],
    },

    barChart: {
        labels: ["Lenovo (STC-02-PC)", "Lenovo (STC-04-PC)"],
        data: [16, 1],
        perPms: [
            { PMS001: 5, PMS002: 4, PMS003: 1, PMS004: 1, PMS005: 5 },
            { PMS003: 1 },
        ],
        meta: [
            { equipmentId: "6ab789f525b67aa1415e15ff", code: "STC-02-PC", brand: "Lenovo" },
            { equipmentId: "6a93baa67aab92792b515a84", code: "STC-04-PC", brand: "Lenovo" },
        ],
    },

    lineGraph: {
        labels: ["2026-09-26", "2026-09-27"],
        datasets: [
            { label: "PMS001", data: [4, 1] },
            { label: "PMS002", data: [1, 3] },
            { label: "PMS003", data: [0, 2] },
            { label: "PMS004", data: [0, 1] },
            { label: "PMS005", data: [0, 5] },
            { label: "PMS006", data: [0, 0] },
        ],
    },

    monthlyTracking: {
        months: ["2026-09"],
        combined: [
            {
                month: "2026-09",
                PMS001: 5,
                PMS002: 4,
                PMS003: 2,
                PMS004: 1,
                PMS005: 5,
                PMS006: 0,
                total: 17,
            },
        ],
    },

    pms001ServiceablePie: {
        labels: ["Serviceable", "Non-Serviceable"],
        data: [2, 3],
        percentages: [40, 60],
        total: 5,
        unknownCount: 0,
        grandTotal: 5,
    },

    top10Equipment: {
        top10: [
            {
                rank: 1,
                equipmentId: "6ab789f525b67aa1415e15ff",
                name: "Lenovo (STC-02-PC)",
                brand: "Lenovo",
                code: "STC-02-PC",
                serialNumber: "HP-9335155",
                specification: "cCCCC",
                status: "Not Available",
                totalRecords: 16,
                perPms: { PMS001: 5, PMS002: 4, PMS003: 1, PMS004: 1, PMS005: 5 },
                pmsCovered: ["PMS001", "PMS002", "PMS003", "PMS004", "PMS005"],
                pmsCount: 5,
            },
            {
                rank: 2,
                equipmentId: "6a93baa67aab92792b515a84",
                name: "Lenovo (STC-04-PC)",
                brand: "Lenovo",
                code: "STC-04-PC",
                serialNumber: "HP-9335177",
                specification: "vgvvvb",
                status: "Not Available",
                totalRecords: 1,
                perPms: { PMS003: 1 },
                pmsCovered: ["PMS003"],
                pmsCount: 1,
            },
        ],
        totalEquipmentTracked: 2,
    },

    data: {
        _id: "678cb22841271160b2d26770",
        LaboratoryName: "LABORATORY",
    },
};

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                          */
/* ------------------------------------------------------------------ */
const COLORS = [
    "#2563eb",
    "#eab308",
    "#3b82f6",
    "#facc15",
    "#60a5fa",
    "#fde047",
    "#1e40af",
    "#ca8a04",
];

const DEFAULT_PMS_KEYS = [
    "PMS001",
    "PMS002",
    "PMS003",
    "PMS004",
    "PMS005",
    "PMS006",
];

const tooltipStyle = {
    backgroundColor: "#0f172a",
    borderRadius: "10px",
    border: "1px solid #334155",
    color: "#f8fafc",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
};

const safeArray = (v) => (Array.isArray(v) ? v : []);

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */
const UserDashboard = ({ laboratoryData }) => {
    const hasRealData =
        laboratoryData &&
        (safeArray(laboratoryData?.lineGraph?.labels).length > 0 ||
            safeArray(laboratoryData?.pieChart?.labels).length > 0 ||
            safeArray(laboratoryData?.barChart?.labels).length > 0 ||
            safeArray(laboratoryData?.monthlyTracking?.combined).length > 0 ||
            safeArray(laboratoryData?.top10Equipment?.top10).length > 0);

    const source = hasRealData ? laboratoryData : dummyData;

    const PMS_KEYS =
        safeArray(source.pmsKeys).length > 0
            ? source.pmsKeys
            : DEFAULT_PMS_KEYS;

    /* ---------------- LINE ---------------- */
    const lineGraph = source?.lineGraph;
    const lineLabels = safeArray(lineGraph?.labels);
    const lineDatasets = safeArray(lineGraph?.datasets);

    const lineData = lineLabels.map((label, idx) => {
        const row = { date: label };
        let total = 0;
        lineDatasets.forEach((ds) => {
            const val = safeArray(ds?.data)[idx] ?? 0;
            row[ds.label] = val;
            total += val;
        });
        row.Total = total;
        return row;
    });

    const hasLine = lineData.length > 0 && lineDatasets.length > 0;
    const grandTotal = lineData.reduce((sum, r) => sum + (r.Total || 0), 0);

    /* ---------------- PIE ---------------- */
    const pieChart = source?.pieChart;
    const pieLabels = safeArray(pieChart?.labels);
    const pieValues = safeArray(pieChart?.data);

    const pieData = pieLabels
        .map((label, idx) => ({ name: label, value: pieValues[idx] ?? 0 }))
        .filter((d) => d.value > 0);

    const hasPie = pieData.length > 0;

    /* ---------------- BAR ---------------- */
    const barChart = source?.barChart;
    const barLabels = safeArray(barChart?.labels);
    const barValues = safeArray(barChart?.data);

    const barData = barLabels.map((label, idx) => ({
        name: label,
        value: barValues[idx] ?? 0,
    }));

    const hasBar = barData.length > 0;

    /* ---------------- MONTHLY ---------------- */
    const monthlyCombined = safeArray(source?.monthlyTracking?.combined);
    const monthlyArea = monthlyCombined.map((row) => ({ ...row }));
    const hasMonthly = monthlyArea.length > 0;

    /* ---------------- TOP 10 ---------------- */
    const top10 = safeArray(source?.top10Equipment?.top10);
    const totalTracked =
        source?.top10Equipment?.totalEquipmentTracked ?? 0;
    const hasTop10 = top10.length > 0;

    /* ---------------- PMS001 SERVICEABLE PIE ---------------- */
    const pms001Pie = source?.pms001ServiceablePie;
    const pms001PieLabels = safeArray(pms001Pie?.labels);
    const pms001PieValues = safeArray(pms001Pie?.data);
    const pms001PiePct = safeArray(pms001Pie?.percentages);

    const pms001PieData = pms001PieLabels.map((label, idx) => ({
        name: label,
        value: pms001PieValues[idx] ?? 0,
        percentage: pms001PiePct[idx] ?? 0,
    }));

    const hasPms001Pie = pms001PieData.length > 0;
    const pms001PieTotal = pms001Pie?.total ?? 0;

    /* ---------------- EMPTY ---------------- */
    const isEmpty =
        !hasLine &&
        !hasPie &&
        !hasBar &&
        !hasMonthly &&
        !hasTop10 &&
        !hasPms001Pie;

    /* ================================================================ */
    return (
        <div className="relative py-12 px-6 sm:px-8 bg-slate-50 rounded-3xl border border-blue-200 shadow-xl">
            {/* EMPTY */}
            {isEmpty && (
                <div className="w-full bg-white rounded-2xl p-12 border text-center">
                    <h3 className="text-sm font-bold uppercase text-slate-700">
                        No data available
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">
                        Walang chart data na maipapakita.
                    </p>
                </div>
            )}

            {/* ROW 1: LINE + PIE */}
            {(hasLine || hasPie) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-6xl mx-auto">
                    {hasLine && (
                        <div className="bg-white rounded-2xl p-6 border shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                        Daily Usage Trend
                                    </h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        Records per day — per PMS
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase text-slate-400 font-semibold">
                                        Total
                                    </div>
                                    <div className="text-lg font-bold text-blue-600">
                                        {grandTotal}
                                    </div>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart
                                    data={lineData}
                                    margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="4 4"
                                        stroke="#e2e8f0"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="date"
                                        fontSize={11}
                                        stroke="#94a3b8"
                                        tickLine={false}
                                        axisLine={{ stroke: "#e2e8f0" }}
                                        tick={{ fill: "#64748b" }}
                                    />
                                    <YAxis
                                        fontSize={11}
                                        stroke="#94a3b8"
                                        allowDecimals={false}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: "#64748b" }}
                                    />
                                    <Tooltip
                                        cursor={{
                                            stroke: "#cbd5e1",
                                            strokeWidth: 1,
                                            strokeDasharray: "4 4",
                                        }}
                                        contentStyle={tooltipStyle}
                                    />
                                    <Legend
                                        wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                                        iconType="circle"
                                        iconSize={8}
                                    />
                                    {lineDatasets.map((ds, idx) => (
                                        <Line
                                            key={ds.label}
                                            type="monotone"
                                            dataKey={ds.label}
                                            stroke={COLORS[idx % COLORS.length]}
                                            strokeWidth={2.5}
                                            dot={{
                                                r: 3.5,
                                                fill: "#fff",
                                                stroke: COLORS[idx % COLORS.length],
                                                strokeWidth: 2,
                                            }}
                                            activeDot={{
                                                r: 6,
                                                fill: COLORS[idx % COLORS.length],
                                                stroke: "#fff",
                                                strokeWidth: 2,
                                            }}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {hasPie && (
                        <div className="bg-white rounded-2xl p-6 border shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                        PMS Distribution Share
                                    </h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        Overall breakdown per PMS
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase text-slate-400 font-semibold">
                                        Total
                                    </div>
                                    <div className="text-lg font-bold text-yellow-600">
                                        {pieData.reduce((s, d) => s + d.value, 0)}
                                    </div>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={95}
                                        innerRadius={55}
                                        paddingAngle={3}
                                        dataKey="value"
                                        label={({ name, value, percent }) =>
                                            `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                                        }
                                        labelLine={{ stroke: "#cbd5e1" }}
                                    >
                                        {pieData.map((entry, idx) => {
                                            const pmsIdx = PMS_KEYS.indexOf(entry.name);
                                            return (
                                                <Cell
                                                    key={`cell-${idx}`}
                                                    fill={
                                                        COLORS[
                                                            (pmsIdx >= 0
                                                                ? pmsIdx
                                                                : idx) % COLORS.length
                                                        ]
                                                    }
                                                />
                                            );
                                        })}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* ROW: PMS001 SERVICEABLE PIE */}
            {hasPms001Pie && (
                <div className="w-full max-w-6xl mx-auto mt-6">
                    <div className="bg-white rounded-2xl p-6 border shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                                    <FaChartPie size={18} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                        PMS001 — Serviceability Status
                                    </h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        Serviceable vs Non-Serviceable
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase text-slate-400 font-semibold">
                                    Total
                                </div>
                                <div className="text-lg font-bold text-blue-600">
                                    {pms001PieTotal}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={pms001PieData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={95}
                                        innerRadius={55}
                                        paddingAngle={4}
                                        dataKey="value"
                                        label={({ name, value, percent }) =>
                                            `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                                        }
                                        labelLine={{ stroke: "#cbd5e1" }}
                                    >
                                        {pms001PieData.map((_, idx) => (
                                            <Cell
                                                key={`pms001-${idx}`}
                                                fill={idx === 0 ? "#22c55e" : "#ef4444"}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>

                            <div className="space-y-3">
                                {pms001PieData.map((entry, idx) => {
                                    const color = idx === 0 ? "#22c55e" : "#ef4444";
                                    return (
                                        <div
                                            key={entry.name}
                                            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: color }}
                                                />
                                                <div>
                                                    <div className="text-xs font-bold text-slate-800">
                                                        {entry.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">
                                                        {entry.percentage}% of total
                                                    </div>
                                                </div>
                                            </div>
                                            <div
                                                className="text-xl font-bold"
                                                style={{ color }}
                                            >
                                                {entry.value}
                                            </div>
                                        </div>
                                    );
                                })}
                                {pms001Pie?.unknownCount > 0 && (
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-100/50">
                                        <div className="flex items-center gap-3">
                                            <span className="w-3 h-3 rounded-full bg-slate-400" />
                                            <div>
                                                <div className="text-xs font-bold text-slate-700">
                                                    Unknown
                                                </div>
                                                <div className="text-[10px] text-slate-500">
                                                    Walang serviceable flag
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xl font-bold text-slate-600">
                                            {pms001Pie.unknownCount}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ROW 2: BAR + AREA */}
            {(hasBar || hasMonthly) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-6xl mx-auto mt-6">
                    {hasBar && (
                        <div className="bg-white rounded-2xl p-6 border shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                        Records per Equipment
                                    </h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        Total maintenance records
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase text-slate-400 font-semibold">
                                        Equipment
                                    </div>
                                    <div className="text-lg font-bold text-blue-600">
                                        {barData.length}
                                    </div>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={barData}
                                    margin={{ top: 10, right: 20, left: -10, bottom: 30 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="4 4"
                                        stroke="#e2e8f0"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="name"
                                        fontSize={10}
                                        stroke="#94a3b8"
                                        tickLine={false}
                                        axisLine={{ stroke: "#e2e8f0" }}
                                        tick={{ fill: "#64748b" }}
                                        interval={0}
                                        angle={-15}
                                        textAnchor="end"
                                        height={50}
                                    />
                                    <YAxis
                                        fontSize={11}
                                        stroke="#94a3b8"
                                        allowDecimals={false}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: "#64748b" }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: "rgba(226, 232, 240, 0.4)" }}
                                        contentStyle={tooltipStyle}
                                    />
                                    <Bar
                                        dataKey="value"
                                        radius={[8, 8, 0, 0]}
                                        maxBarSize={60}
                                    >
                                        {barData.map((_, idx) => (
                                            <Cell
                                                key={`bar-${idx}`}
                                                fill={COLORS[idx % COLORS.length]}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {hasMonthly && (
                        <div className="bg-white rounded-2xl p-6 border shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                        Monthly Trend per PMS
                                    </h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        Stacked records per month
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase text-slate-400 font-semibold">
                                        Months
                                    </div>
                                    <div className="text-lg font-bold text-blue-600">
                                        {monthlyCombined.length}
                                    </div>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart
                                    data={monthlyArea}
                                    margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                                >
                                    <defs>
                                        {PMS_KEYS.map((key, idx) => (
                                            <linearGradient
                                                key={`color-${key}`}
                                                id={`color-${key}`}
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >
                                                <stop
                                                    offset="5%"
                                                    stopColor={COLORS[idx % COLORS.length]}
                                                    stopOpacity={0.8}
                                                />
                                                <stop
                                                    offset="95%"
                                                    stopColor={COLORS[idx % COLORS.length]}
                                                    stopOpacity={0.1}
                                                />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="4 4"
                                        stroke="#e2e8f0"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="month"
                                        fontSize={11}
                                        stroke="#94a3b8"
                                        tickLine={false}
                                        axisLine={{ stroke: "#e2e8f0" }}
                                        tick={{ fill: "#64748b" }}
                                    />
                                    <YAxis
                                        fontSize={11}
                                        stroke="#94a3b8"
                                        allowDecimals={false}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: "#64748b" }}
                                    />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend
                                        wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                                        iconType="circle"
                                        iconSize={8}
                                    />
                                    {PMS_KEYS.map((key, idx) => (
                                        <Area
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            stackId="1"
                                            stroke={COLORS[idx % COLORS.length]}
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill={`url(#color-${key})`}
                                        />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* ROW 3: MONTHLY TABLE */}
            {hasMonthly && (
                <div className="w-full max-w-6xl mx-auto mt-6">
                    <div className="bg-white rounded-2xl p-6 border shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                    Monthly Records Breakdown
                                </h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    Records per PMS per month
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] uppercase text-slate-400 font-semibold">
                                    Grand Total
                                </div>
                                <div className="text-lg font-bold text-blue-600">
                                    {monthlyCombined.reduce(
                                        (s, r) => s + (r.total || 0),
                                        0
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="border-b bg-slate-100">
                                        <th className="p-3 font-bold uppercase text-slate-700">
                                            Month
                                        </th>
                                        {PMS_KEYS.map((k) => (
                                            <th
                                                key={k}
                                                className="p-3 text-center font-bold uppercase text-slate-700"
                                            >
                                                {k}
                                            </th>
                                        ))}
                                        <th className="p-3 text-center font-bold uppercase text-blue-600">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {monthlyCombined.map((row) => (
                                        <tr
                                            key={row.month}
                                            className="hover:bg-slate-50 transition-colors"
                                        >
                                            <td className="p-3 font-semibold text-slate-800">
                                                {row.month}
                                            </td>
                                            {PMS_KEYS.map((k) => {
                                                const val = row[k] || 0;
                                                return (
                                                    <td
                                                        key={k}
                                                        className={`p-3 text-center font-medium ${
                                                            val > 0
                                                                ? "text-slate-800"
                                                                : "text-slate-300"
                                                        }`}
                                                    >
                                                        {val}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-3 text-center font-bold text-blue-600">
                                                {row.total}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ROW 4: TOP 10 EQUIPMENT */}
            {hasTop10 && (
                <div className="w-full max-w-6xl mx-auto mt-6">
                    <div className="bg-white rounded-2xl p-6 border shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                    Top Equipment by Records
                                </h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {totalTracked} equipment tracked
                                </p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="border-b bg-slate-100">
                                        <th className="p-3 font-bold uppercase text-slate-700">
                                            Rank
                                        </th>
                                        <th className="p-3 font-bold uppercase text-slate-700">
                                            Equipment
                                        </th>
                                        <th className="p-3 font-bold uppercase text-slate-700">
                                            Serial
                                        </th>
                                        <th className="p-3 text-center font-bold uppercase text-slate-700">
                                            PMS Covered
                                        </th>
                                        {PMS_KEYS.map((k) => (
                                            <th
                                                key={k}
                                                className="p-3 text-center font-bold uppercase text-slate-700"
                                            >
                                                {k}
                                            </th>
                                        ))}
                                        <th className="p-3 text-center font-bold uppercase text-blue-600">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {top10.map((eq) => (
                                        <tr
                                            key={eq.equipmentId}
                                            className="hover:bg-slate-50 transition-colors"
                                        >
                                            <td className="p-3">
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                                                    {eq.rank}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="font-semibold text-slate-800">
                                                    {eq.name}
                                                </div>
                                                <div className="text-[10px] text-slate-500">
                                                    {eq.brand} • {eq.specification}
                                                </div>
                                            </td>
                                            <td className="p-3 font-mono text-[10px] text-slate-600">
                                                {eq.serialNumber}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">
                                                    {eq.pmsCount}/{PMS_KEYS.length}
                                                </span>
                                            </td>
                                            {PMS_KEYS.map((k) => {
                                                const val = eq.perPms?.[k] || 0;
                                                return (
                                                    <td
                                                        key={k}
                                                        className={`p-3 text-center font-medium ${
                                                            val > 0
                                                                ? "text-slate-800"
                                                                : "text-slate-300"
                                                        }`}
                                                    >
                                                        {val}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-3 text-center font-bold text-blue-600">
                                                {eq.totalRecords}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDashboard;