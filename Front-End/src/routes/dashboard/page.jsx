import React, { useRef, useEffect, useContext, useState, useCallback, useMemo } from "react";
import { Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend, Line, LineChart, ComposedChart, Bar, BarChart, Cell, PieChart, Pie } from "recharts";
import { useTheme } from "@/hooks/use-theme";
import { Footer } from "../../layouts/footer";
import { FaChartLine, FaChartBar, FaStar } from "react-icons/fa";
import DashboardCard from "../../components/Card/DashboardCard";
import TechnicianTable from "../../components/Technician/TechnicianTable";
import Laboratory from "../../components/Assign/Laboratory";

// Contexts
import { AuthContext } from "../../contexts/AuthContext";
import { FilterSpecificAssignContext } from "../../contexts/FilterSpecificAssignContext/FilterSpecificAssignContext";
import { IncomingDisplayContext } from "../../contexts/ProcessIncomingRequest/IncomingRequestContext";

// React Hooks
import { useInView } from "react-intersection-observer";
import { useLocation, useNavigate } from "react-router-dom";
import { StatisticsContext } from "../../contexts/StatisticContext/statisticalContext";
import { MaintenanceRequestContext } from "../../contexts/MaintenanceRequestContext/MaintenanceRequestContext";
import { UserDataContext } from "../../contexts/UserContext/UserContext";
import Authorizedpage from "../../components/Authorized/authorizepage";

// Icons
import { FaFlask, FaTerminal, FaUserEdit, FaChevronRight, FaTools, FaDownload, FaPrint, FaClipboardList, FaWrench, FaClock, FaCheckCircle, FaExclamationTriangle, FaTimes, FaUserPlus, FaCheck } from "react-icons/fa";

// Separated Components
import DashboardBanner from "../../routes/dashboard/dashboardRole/DashboardBanner";
import ProfessionalLineGraph from "../../routes/dashboard/dashboardRole/ProfessionalLineGraph";
import ProfessionalBarChart from "../../routes/dashboard/dashboardRole/ProfessionalBarChart";
import DashboardPieCharts from "../../routes/dashboard/dashboardRole/DashboardPieCharts";
import UserDashboard from "../../routes/dashboard/dashboardRole/UserDashboard";
import TechnicianDashboard from "../../routes/dashboard/dashboardRole/TechnicianDashboard";
import SupplyDashboard from "./dashboardRole/SupplyDashboard";

import ReassignModal from './dashboardRole/ReassignModal';

/* ============================================================ */
/*  SKELETON PRIMITIVES                                         */
/* ============================================================ */
const SkeletonPulse = ({ className = "" }) => (
    <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
);

const SkeletonAvatar = ({ size = 80 }) => (
    <div
        className="animate-pulse bg-slate-200 rounded-full"
        style={{ width: size, height: size }}
    />
);

const SkeletonCardBlock = ({ className = "", children }) => (
    <div className={`bg-white rounded-[2rem] shadow-lg border border-gray-200 ${className}`}>
        {children}
    </div>
);

/* ---------- Technicians Avatar Carousel Skeleton ---------- */
const TechniciansSkeleton = () => (
    <SkeletonCardBlock className="p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <SkeletonPulse className="w-11 h-11 rounded-xl" />
            <div className="space-y-2 flex-1">
                <SkeletonPulse className="h-3 w-64" />
                <SkeletonPulse className="h-2 w-80" />
            </div>
            <SkeletonPulse className="h-5 w-32 rounded-full" />
        </div>

        <div className="flex gap-6 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="flex flex-col items-center flex-shrink-0"
                    style={{ width: `${100 / 6}%` }}
                >
                    <SkeletonAvatar size={80} />
                    <SkeletonPulse className="h-3 w-20 mt-3" />
                    <SkeletonPulse className="h-2 w-14 mt-2" />
                </div>
            ))}
        </div>
    </SkeletonCardBlock>
);

/* ---------- Chart Panel Skeleton ---------- */
const ChartPanelSkeleton = ({ height = 300, hasToggle = false }) => (
    <SkeletonCardBlock className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
                <SkeletonPulse className="w-11 h-11 rounded-xl" />
                <div className="space-y-2">
                    <SkeletonPulse className="h-3 w-52" />
                    <SkeletonPulse className="h-2 w-64" />
                </div>
            </div>
            {hasToggle && (
                <div className="flex gap-1 bg-white p-1 rounded-xl border border-gray-200">
                    <SkeletonPulse className="h-7 w-16 rounded-lg" />
                    <SkeletonPulse className="h-7 w-16 rounded-lg" />
                </div>
            )}
        </div>

        <div className="relative" style={{ height }}>
            <SkeletonPulse className="w-full h-full rounded-xl" />
            <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
                {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonPulse key={i} className="h-2 w-10" />
                ))}
            </div>
        </div>
    </SkeletonCardBlock>
);

/* ---------- Pie Charts Section Skeleton ---------- */
const PieChartsSkeleton = () => (
    <SkeletonCardBlock className="p-6">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
            <SkeletonPulse className="w-11 h-11 rounded-xl" />
            <SkeletonPulse className="h-3 w-56" />
            <SkeletonPulse className="ml-auto h-5 w-24 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3">
                    <SkeletonPulse className="h-64 w-full rounded-2xl" />
                    <SkeletonPulse className="h-3 w-32 mx-auto" />
                </div>
            ))}
        </div>
    </SkeletonCardBlock>
);

/* ---------- Chart Toggle Skeleton ---------- */
const ChartToggleSkeleton = () => (
    <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex gap-2 bg-white p-1.5 rounded-xl shadow-md border border-gray-200">
            <SkeletonPulse className="h-10 w-32 rounded-lg" />
            <SkeletonPulse className="h-10 w-32 rounded-lg" />
        </div>
        <div className="flex gap-1.5 bg-white p-1.5 rounded-xl shadow-md border border-gray-200">
            {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonPulse key={i} className="h-8 w-24 rounded-lg" />
            ))}
        </div>
    </div>
);

/* ---------- Full Admin Dashboard Skeleton ---------- */
const AdminDashboardSkeleton = () => (
    <div className="space-y-8">
        <TechniciansSkeleton />
        <ChartToggleSkeleton />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="xl:col-span-2">
                <ChartPanelSkeleton height={340} hasToggle />
            </div>
        </div>
        <PieChartsSkeleton />
    </div>
);

/* ---------- Generic Dashboard Role Skeleton ---------- */
const RoleDashboardSkeleton = () => (
    <div className="space-y-8">
        <ChartToggleSkeleton />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartPanelSkeleton height={300} />
            <ChartPanelSkeleton height={300} />
        </div>
        <PieChartsSkeleton />
    </div>
);

/* ---------- Laboratory View Skeleton ---------- */
const LaboratoryViewSkeleton = () => (
    <div className="space-y-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-blue-700/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-yellow-400" />
            <div className="space-y-4">
                <SkeletonPulse className="h-6 w-64" />
                <SkeletonPulse className="h-4 w-96" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <SkeletonPulse key={i} className="h-24 w-full rounded-2xl" />
                    ))}
                </div>
            </div>
        </div>
    </div>
);

/* ---------- Logout Redirect Screen ---------- */
const LoggingOutScreen = () => (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-700 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-blue-700 font-bold uppercase tracking-widest text-sm">
                Logging out...
            </p>
        </div>
    </div>
);

/* ============================================================ */
/*  DASHBOARD                                                   */
/* ============================================================ */
function Dashboard() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });
    const { laboratoryData } = useContext(FilterSpecificAssignContext);
    const { role, logout } = useContext(AuthContext);
    const { fetchIncomingData } = useContext(IncomingDisplayContext);
    const location = useLocation();
    const navigate = useNavigate();
    const {
        technicianStats,
        statisticsData,
        supplyStatistics,
        fetchStatisticsData,
        fetchSupplyStatistics,
        fetchTechnicianStatistics
    } = useContext(StatisticsContext);
    const { theme } = useTheme();
    const isDark = theme === "dark";

    // ==========================================
    // LOADING STATE PER ROLE
    // ==========================================
    const [statsLoading, setStatsLoading] = useState(true);
    const [incomingLoading, setIncomingLoading] = useState(false);

    // ✅ BAGO: State para i-track kung nag-logout na (para hindi i-render ang Authorizedpage)
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // ==========================================
    // USE REFS PARA I-STABILIZE ANG FUNCTIONS
    // ==========================================
    const fetchStatisticsDataRef = useRef(fetchStatisticsData);
    const fetchTechnicianStatisticsRef = useRef(fetchTechnicianStatistics);
    const fetchSupplyStatisticsRef = useRef(fetchSupplyStatistics);
    const fetchIncomingDataRef = useRef(fetchIncomingData);
    const hasFetchedRef = useRef(false);

    // ✅ BAGO: Ref para hindi ma-trigger ang logout nang paulit-ulit
    const hasLoggedOutRef = useRef(false);

    useEffect(() => {
        fetchStatisticsDataRef.current = fetchStatisticsData;
        fetchTechnicianStatisticsRef.current = fetchTechnicianStatistics;
        fetchSupplyStatisticsRef.current = fetchSupplyStatistics;
        fetchIncomingDataRef.current = fetchIncomingData;
    }, [fetchStatisticsData, fetchTechnicianStatistics, fetchSupplyStatistics, fetchIncomingData]);

    console.log("statisticsData", statisticsData);

    const laboratory = location.state?.laboratory;

    const handleSelectDisplay = useCallback((selectedAssignEquipment) => {
        navigate("/dashboard/RequestMaintenances", { state: { selectedAssignEquipment } });
    }, [navigate]);

    // ==========================================
    // ROLE-BASED STATISTICS FETCHING
    // ==========================================
    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        console.log("🔄 Role:", role);

        const fetchStatistics = async () => {
            try {
                setStatsLoading(true);

                if (role === "Admin") {
                    console.log("📊 Fetching Admin Statistics...");
                    await Promise.all([
                        fetchStatisticsDataRef.current(),
                        fetchTechnicianStatisticsRef.current(),
                        fetchSupplyStatisticsRef.current()
                    ]);
                } else if (role === "Technician") {
                    console.log("🔧 Fetching Technician Statistics...");
                    await fetchTechnicianStatisticsRef.current();
                } else if (role === "Supply") {
                    console.log("📦 Fetching Supply Statistics...");
                    await fetchSupplyStatisticsRef.current();
                } else if (role === "User") {
                    console.log("👤 Fetching User Statistics...");
                }
                hasFetchedRef.current = true;
            } catch (error) {
                console.error(`❌ Error fetching ${role} statistics:`, error);
            } finally {
                if (isMounted) setStatsLoading(false);
            }
        };

        if (role) {
            hasFetchedRef.current = false;
            setStatsLoading(true);
        }

        timeoutId = setTimeout(() => {
            if (isMounted && !hasFetchedRef.current) {
                fetchStatistics();
            }
        }, 100);

        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [role]);

    // ==========================================
    // ADMIN - Fetch Incoming Data
    // ==========================================
    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        if (role === "Admin") {
            console.log("📥 Fetching Admin Incoming Data...");
            setIncomingLoading(true);
            timeoutId = setTimeout(async () => {
                if (isMounted) {
                    try {
                        await fetchIncomingDataRef.current();
                    } finally {
                        if (isMounted) setIncomingLoading(false);
                    }
                }
            }, 200);
        }

        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [role]);

    const isDashboardLoading =
        statsLoading || (role === "Admin" && incomingLoading);

    // ==========================================
    // ✅ BAGO: DIRECT LOGOUT KAPAG WALANG SIDEBAR
    // Para sa Admin, Technician, at Supply roles
    // Hindi na ipapakita ang Authorizedpage
    // ==========================================
    useEffect(() => {
        const rolesRequiringSidebar = ["Admin", "Technician", "Supply"];

        // Skip kung hindi kasama sa roles o kung nag-load pa lang
        if (!rolesRequiringSidebar.includes(role)) return;
        if (isDashboardLoading) return;
        if (hasLoggedOutRef.current) return;

        const checkSidebarAndLogout = () => {
            // Hanapin ang sidebar sa DOM
            const sidebar =
                document.getElementById("main-sidebar") ||
                document.getElementById("sidebar") ||
                document.querySelector('aside[data-sidebar="true"]') ||
                document.querySelector('aside.sidebar') ||
                document.querySelector('nav[role="navigation"]') ||
                document.querySelector('[class*="sidebar"]');

            if (!sidebar) {
                console.warn(`⚠️ Walang sidebar para sa role: ${role}. Direct logout...`);
                hasLoggedOutRef.current = true;

                // ✅ Ipakita ang logging out screen (hindi na i-render ang Authorizedpage)
                setIsLoggingOut(true);

                // I-clear ang auth data at i-redirect
                try {
                    if (typeof logout === "function") {
                        logout();
                    } else {
                        localStorage.removeItem("token");
                        localStorage.removeItem("authToken");
                        localStorage.removeItem("user");
                        sessionStorage.clear();
                        navigate("/login", { replace: true });
                    }
                } catch (err) {
                    console.error("❌ Error sa auto logout:", err);
                    localStorage.clear();
                    sessionStorage.clear();
                    navigate("/login", { replace: true });
                }
            }
        };

        // Hintayin ang DOM na mag-render bago i-check
        const timer = setTimeout(checkSidebarAndLogout, 500);
        return () => clearTimeout(timer);
    }, [role, isDashboardLoading, logout, navigate]);

    // ✅ BAGO: Kung nag-logout na, ipakita lang ang LoggingOutScreen
    // Hindi na i-render ang buong dashboard at Authorizedpage
    if (isLoggingOut) {
        return <LoggingOutScreen />;
    }

    return (
        <div className="flex h-screen w-full bg-white overflow-hidden font-poppins">
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <main className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50">
                    <div
                        ref={ref}
                        className={`p-4 sm:p-6 lg:p-8 transition-all duration-500 ease-out ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                            }`}
                    >
                        <div className="mt-2">
                            {laboratory ? (
                                <div className="animate-[fadeIn_0.3s_ease-out]">
                                    {isDashboardLoading ? (
                                        <LaboratoryViewSkeleton />
                                    ) : (
                                        <LaboratoryView laboratory={laboratory} />
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <div className="grid grid-cols-1">
                                        {isDashboardLoading ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                {Array.from({ length: 4 }).map((_, i) => (
                                                    <SkeletonPulse
                                                        key={i}
                                                        className="h-32 w-full rounded-2xl"
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <DashboardCard
                                                Laboratory={laboratoryData}
                                                statisticsData={statisticsData}
                                                technicianStats={technicianStats}
                                                supplyStatistics={supplyStatistics}
                                            />
                                        )}
                                    </div>

                                    {isDashboardLoading ? (
                                        <>
                                            {role === "Admin" && <AdminDashboardSkeleton />}
                                            {role === "User" && <RoleDashboardSkeleton />}
                                            {role === "Technician" && <RoleDashboardSkeleton />}
                                            {role === "Supply" && <RoleDashboardSkeleton />}
                                        </>
                                    ) : (
                                        <>
                                            {role === "Admin" && (
                                                <Authorizedpage />
                                            )}

                                            {role === "User" && (
                                                <UserDashboard onSelect={handleSelectDisplay} laboratoryData={laboratoryData} />
                                            )}

                                            {role === "Technician" && <Authorizedpage />}

                                            {role === "Supply" && <Authorizedpage />}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <footer className="mt-4">
                        <Footer />
                    </footer>
                </main>
            </div>
        </div>
    );
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================
const AdminDashboard = React.memo(({ statisticsData }) => {
    const { technicians, techniciansLoading } = useContext(UserDataContext);
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [timeRange, setTimeRange] = useState("yearly");
    const [activeChart, setActiveChart] = useState("line");
    const [barChartType, setBarChartType] = useState("equipment");
    const [selectedTechnician, setSelectedTechnician] = useState(null);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const { technicianTasks } = useContext(MaintenanceRequestContext);

    // Reassign Modal State
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [selectedTaskTechnician, setSelectedTaskTechnician] = useState('');
    const [isReassigning, setIsReassigning] = useState(false);
    const [isLoadingTechnicians, setIsLoadingTechnicians] = useState(false);

    const { pieCharts, lineGraphs, barCharts } = statisticsData || {};

    const taskStats = useMemo(() => {
        if (!technicianTasks || technicianTasks.length === 0) {
            return {
                totalTasks: 0,
                completedTasks: 0,
                assignedTasks: 0,
                inProgressTasks: 0,
                pendingTasks: 0,
                tasks: [],
                technicians: []
            };
        }

        const technicians = technicianTasks.map(taskData => {
            const tasks = taskData?.tasks || [];

            const completed = tasks.filter(t => t.Status === "Completed").length;
            const assigned = tasks.filter(t => t.Status === "Assigned").length;
            const inProgress = tasks.filter(t => t.Status === "In Progress").length;
            const pending = tasks.filter(t => t.Status === "Pending").length;

            return {
                technicianName: taskData?.technicianName || 'Unknown Technician',
                technicianId: taskData?.technicianId?.[0] || taskData?.technicianId || '',
                totalTasks: taskData?.totalTasks || tasks.length,
                completedTasks: completed,
                assignedTasks: assigned,
                inProgressTasks: inProgress,
                pendingTasks: pending,
                tasks: tasks,
                hasAssignedTasks: assigned > 0
            };
        });

        technicians.sort((a, b) => {
            if (a.hasAssignedTasks && !b.hasAssignedTasks) return -1;
            if (!a.hasAssignedTasks && b.hasAssignedTasks) return 1;
            return b.assignedTasks - a.assignedTasks;
        });

        const totalTechs = technicians.length;
        const techniciansWithTasks = technicians.filter(t => t.hasAssignedTasks).length;
        const totalAllTasks = technicians.reduce((sum, t) => sum + t.totalTasks, 0);
        const totalCompleted = technicians.reduce((sum, t) => sum + t.completedTasks, 0);
        const totalAssigned = technicians.reduce((sum, t) => sum + t.assignedTasks, 0);
        const totalInProgress = technicians.reduce((sum, t) => sum + t.inProgressTasks, 0);
        const totalPending = technicians.reduce((sum, t) => sum + t.pendingTasks, 0);

        return {
            totalTasks: totalAllTasks,
            completedTasks: totalCompleted,
            assignedTasks: totalAssigned,
            inProgressTasks: totalInProgress,
            pendingTasks: totalPending,
            technicians: technicians,
            totalTechnicians: totalTechs,
            techniciansWithTasks: techniciansWithTasks,
            tasks: technicians.flatMap(t => t.tasks)
        };
    }, [technicianTasks]);

    const itemsPerPage = 6;
    const totalPages = Math.ceil(taskStats.technicians.length / itemsPerPage);
    const maxIndex = totalPages - 1;

    const getInitials = useCallback((name) => {
        if (!name || name === 'N/A') return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }, []);

    const getAvatarColor = useCallback((name) => {
        const colors = [
            'from-blue-600 to-blue-700',
            'from-green-500 to-green-600',
            'from-purple-500 to-purple-600',
            'from-pink-500 to-pink-600',
            'from-indigo-500 to-indigo-600',
            'from-red-500 to-red-600',
            'from-teal-500 to-teal-600',
            'from-orange-500 to-orange-600',
            'from-cyan-500 to-cyan-600',
            'from-rose-500 to-rose-600'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }, []);

    const handleAvatarClick = useCallback((technician) => {
        if (!technician.hasAssignedTasks) {
            return;
        }
        setSelectedTechnician(technician);
        setShowTaskModal(true);
    }, []);

    const closeModal = useCallback(() => {
        setShowTaskModal(false);
        setSelectedTechnician(null);
    }, []);

    const handleOpenReassignModal = useCallback((task) => {
        setSelectedTask(task);
        const tech = taskStats.technicians.find(t =>
            t.tasks.some(tk => tk._id === task._id)
        );
        setSelectedTaskTechnician(tech?.technicianName || 'Unknown');
        setShowReassignModal(true);
        setIsLoadingTechnicians(false);
    }, [taskStats.technicians]);

    const handleCloseReassignModal = useCallback(() => {
        setShowReassignModal(false);
        setSelectedTask(null);
        setSelectedTaskTechnician('');
        setIsReassigning(false);
    }, []);

    const handleReassignSubmit = useCallback((data) => {
        setIsReassigning(true);
        console.log('Reassign data:', data);
        setTimeout(() => {
            alert(`Task ${data.taskRef || data.taskId} reassigned to ${data.newTechnicianName}`);
            setIsReassigning(false);
            handleCloseReassignModal();
        }, 1500);
    }, [handleCloseReassignModal]);

    const handlePrevPage = useCallback(() => {
        setCurrentIndex(prev => Math.max(0, prev - 1));
    }, []);

    const handleNextPage = useCallback(() => {
        setCurrentIndex(prev => Math.min(maxIndex, prev + 1));
    }, [maxIndex]);

    const handlePageClick = useCallback((idx) => {
        setCurrentIndex(idx);
    }, []);

    const handleSetActiveChart = useCallback((chart) => {
        setActiveChart(chart);
    }, []);

    const handleSetBarChartType = useCallback((type) => {
        setBarChartType(type);
    }, []);

    const handleSetTimeRange = useCallback((range) => {
        setTimeRange(range);
    }, []);

    if (techniciansLoading && taskStats.technicians.length === 0) {
        return <AdminDashboardSkeleton />;
    }

    return (
        <div className="space-y-8">
            {/* Technicians Avatar Section */}
            {taskStats.technicians.length > 0 ? (
                <div className="bg-white rounded-[2rem] shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                        <div className="p-2.5 bg-blue-700 rounded-xl shadow-lg">
                            <FaWrench className="text-yellow-400 text-xl" />
                        </div>
                        <div>
                            <h3 className="font-black text-blue-700 uppercase text-sm tracking-widest">
                                Technicians & Assigned Tasks
                            </h3>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                {taskStats.techniciansWithTasks} technicians have assigned tasks • {taskStats.assignedTasks} total assigned tasks
                            </p>
                        </div>
                        <span className="ml-auto text-[8px] font-black uppercase tracking-widest text-blue-700 px-3 py-1 rounded-full bg-blue-100">
                            {taskStats.totalTechnicians} Total Technicians
                        </span>
                    </div>

                    {/* Avatar Grid - Carousel */}
                    <div className="relative overflow-hidden">
                        <div
                            className="flex gap-6 transition-transform duration-500 ease-in-out"
                            style={{
                                transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`,
                            }}
                        >
                            {taskStats.technicians.map((tech, index) => {
                                const hasTasks = tech.hasAssignedTasks;

                                return (
                                    <div
                                        key={index}
                                        onClick={() => handleAvatarClick(tech)}
                                        className={`flex flex-col items-center flex-shrink-0 transition-transform duration-300 ${hasTasks
                                                ? 'cursor-pointer hover:-translate-y-1 hover:scale-105 active:scale-95'
                                                : 'cursor-default opacity-60'
                                            }`}
                                        style={{ width: `${100 / itemsPerPage}%` }}
                                    >
                                        <div className="relative">
                                            <div className={`w-20 h-20 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-2xl shadow-lg transition-all duration-300 ring-4 ring-transparent ${hasTasks ? 'hover:shadow-2xl hover:ring-yellow-400' : ''}`}>
                                                {getInitials(tech.technicianName)}
                                            </div>
                                            {hasTasks ? (
                                                <div className="absolute -top-1 -right-1 bg-yellow-400 text-blue-700 text-[11px] font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
                                                    {tech.assignedTasks}
                                                </div>
                                            ) : (
                                                <div className="absolute -top-1 -right-1 bg-gray-400 text-white text-[8px] font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg border-2 border-white">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>

                                        <p className={`text-xs font-bold mt-3 text-center ${hasTasks ? 'text-blue-700' : 'text-slate-400'}`}>
                                            {tech.technicianName}
                                        </p>

                                        <div className="flex items-center gap-2 mt-1">
                                            {tech.completedTasks > 0 && (
                                                <span className="text-[10px] font-medium text-green-500 flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                    {tech.completedTasks}
                                                </span>
                                            )}
                                            {tech.inProgressTasks > 0 && (
                                                <span className="text-[10px] font-medium text-yellow-500 flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                                    {tech.inProgressTasks}
                                                </span>
                                            )}
                                            {tech.pendingTasks > 0 && (
                                                <span className="text-[10px] font-medium text-red-500 flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                    {tech.pendingTasks}
                                                </span>
                                            )}
                                            {!hasTasks && (
                                                <span className="text-[10px] font-medium text-gray-400">No assigned tasks</span>
                                            )}
                                        </div>

                                        {hasTasks && (
                                            <span className="text-[8px] text-blue-700 font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                Click to view tasks
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {taskStats.technicians.length > itemsPerPage && (
                            <>
                                <button
                                    onClick={handlePrevPage}
                                    className={`absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-700 text-yellow-400 shadow-lg hover:bg-blue-800 transition-all duration-300 ${currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
                                    disabled={currentIndex === 0}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleNextPage}
                                    className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-700 text-yellow-400 shadow-lg hover:bg-blue-800 transition-all duration-300 ${currentIndex === maxIndex ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
                                    disabled={currentIndex === maxIndex}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </>
                        )}

                        {taskStats.technicians.length > itemsPerPage && (
                            <div className="flex justify-center gap-2 mt-4">
                                {Array.from({ length: totalPages }).map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handlePageClick(idx)}
                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${currentIndex === idx ? 'w-6 bg-blue-700' : 'bg-gray-300 hover:bg-gray-400'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] shadow-lg p-12 text-center border border-gray-200">
                    <FaWrench className="text-6xl text-blue-700/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-blue-700">No Technicians Available</h3>
                    <p className="text-sm text-slate-500 mt-2">No technician tasks have been assigned yet.</p>
                </div>
            )}

            {/* Task Modal */}
            {showTaskModal && selectedTechnician && selectedTechnician.hasAssignedTasks && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
                    onClick={closeModal}
                >
                    <div
                        className="bg-gray-300 rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-[popIn_0.25s_ease-out]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarColor(selectedTechnician.technicianName)} flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                                    {getInitials(selectedTechnician.technicianName)}
                                </div>
                                <div>
                                    <h3 className="font-black text-blue-700 uppercase text-base tracking-widest">
                                        {selectedTechnician.technicianName}
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                        {selectedTechnician.assignedTasks} Assigned • {selectedTechnician.completedTasks} Completed • {selectedTechnician.totalTasks} Total
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            {selectedTechnician.tasks.length > 0 ? (
                                <div className="space-y-6">
                                    {selectedTechnician.tasks.filter(task => task.Status !== 'Completed').length > 0 && (
                                        <div>
                                            <div className="mb-3 text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                                                <span className="w-1 h-4 bg-blue-700 rounded-full"></span>
                                                Active Tasks ({selectedTechnician.assignedTasks + selectedTechnician.inProgressTasks + selectedTechnician.pendingTasks})
                                            </div>
                                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-blue-700">Ref</th>
                                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-blue-700">Description</th>
                                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-blue-700">Status</th>
                                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-blue-700">Date</th>
                                                            <th className="px-4 py-3 text-center text-xs font-bold uppercase text-blue-700">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedTechnician.tasks
                                                            .filter(task => task.Status !== 'Completed')
                                                            .map((task) => (
                                                                <tr key={task._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                                                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{task.Ref}</td>
                                                                    <td className="px-4 py-3 text-gray-700">{task.Description}</td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${task.Status === 'Assigned' ? 'bg-blue-100 text-blue-700' :
                                                                            task.Status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                                                                                'bg-red-100 text-red-700'
                                                                            }`}>
                                                                            {task.Status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-xs text-gray-500">
                                                                        {new Date(task.DateTime).toLocaleDateString('en-US', {
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: 'numeric'
                                                                        })}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <button
                                                                            onClick={() => handleOpenReassignModal(task)}
                                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg border-2 border-orange-600 transition-all shadow-sm hover:shadow-md"
                                                                            title="Reassign this task to another technician"
                                                                        >
                                                                            <FaUserEdit size={12} />
                                                                            ReAssign
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {selectedTechnician.completedTasks > 0 && (
                                        <div>
                                            <div className="mb-3 text-xs font-bold text-green-600 uppercase tracking-wider flex items-center gap-2">
                                                <span className="w-1 h-4 bg-green-500 rounded-full"></span>
                                                Completed Tasks ({selectedTechnician.completedTasks})
                                            </div>
                                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-green-600">Ref</th>
                                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-green-600">Description</th>
                                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-green-600">Status</th>
                                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-green-600">Date</th>
                                                            <th className="px-4 py-3 text-center text-xs font-bold uppercase text-green-600">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedTechnician.tasks
                                                            .filter(task => task.Status === 'Completed')
                                                            .map((task) => (
                                                                <tr key={task._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                                                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{task.Ref}</td>
                                                                    <td className="px-4 py-3 text-gray-700">{task.Description}</td>
                                                                    <td className="px-4 py-3">
                                                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                                            {task.Status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-xs text-gray-500">
                                                                        {new Date(task.DateTime).toLocaleDateString('en-US', {
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: 'numeric'
                                                                        })}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <button
                                                                            disabled
                                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-300 text-gray-500 text-[10px] font-bold uppercase tracking-wider rounded-lg border-2 border-gray-400 cursor-not-allowed transition-all"
                                                                            title="Cannot reassign completed tasks"
                                                                        >
                                                                            <FaUserEdit size={12} />
                                                                            ReAssign
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <FaWrench className="text-4xl text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-400 font-medium">No tasks assigned to this technician</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                Total Tasks: <span className="font-bold text-blue-700">{selectedTechnician.totalTasks}</span>
                            </p>
                            <button
                                onClick={closeModal}
                                className="px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reassign Modal */}
            <ReassignModal
                isOpen={showReassignModal}
                onClose={handleCloseReassignModal}
                task={selectedTask}
                currentTechnician={selectedTaskTechnician}
                technicians={technicians}
                onReassign={handleReassignSubmit}
                isReassigning={isReassigning}
                isLoadingTechnicians={techniciansLoading}
            />

            {/* Chart Toggle */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex gap-2 bg-white p-1.5 rounded-xl shadow-md border border-gray-200">
                    <button
                        onClick={() => handleSetActiveChart("line")}
                        className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 flex items-center gap-2.5 ${activeChart === "line"
                            ? "bg-blue-700 text-yellow-400 shadow-lg shadow-blue-700/30 scale-105"
                            : "bg-transparent text-blue-700/60 hover:text-blue-700 hover:bg-blue-50"
                            }`}
                    >
                        <FaChartLine size={16} className={activeChart === "line" ? "text-yellow-400" : "text-current"} />
                        Line Chart
                        {activeChart === "line" && (
                            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                        )}
                    </button>
                    <button
                        onClick={() => handleSetActiveChart("bar")}
                        className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 flex items-center gap-2.5 ${activeChart === "bar"
                            ? "bg-blue-700 text-yellow-400 shadow-lg shadow-blue-700/30 scale-105"
                            : "bg-transparent text-blue-700/60 hover:text-blue-700 hover:bg-blue-50"
                            }`}
                    >
                        <FaChartBar size={16} className={activeChart === "bar" ? "text-yellow-400" : "text-current"} />
                        Bar Chart
                        {activeChart === "bar" && (
                            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                        )}
                    </button>
                </div>

                {activeChart === "bar" && (
                    <div className="flex gap-1.5 bg-white p-1.5 rounded-xl shadow-md border border-gray-200">
                        {[
                            { value: "equipment", label: "Equipment", icon: <FaFlask size={12} /> },
                            { value: "maintenance", label: "Maintenance", icon: <FaTools size={12} /> },
                            { value: "requests", label: "Requests", icon: <FaChartLine size={12} /> },
                            { value: "feedback", label: "Feedback", icon: <FaStar size={12} /> }
                        ].map((type) => (
                            <button
                                key={type.value}
                                onClick={() => handleSetBarChartType(type.value)}
                                className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 flex items-center gap-2 ${barChartType === type.value
                                    ? "bg-yellow-400 text-blue-700 shadow-lg shadow-yellow-400/30"
                                    : "bg-transparent text-blue-700/50 hover:text-blue-700 hover:bg-yellow-50"
                                    }`}
                            >
                                {type.icon} {type.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {activeChart === "line" && (
                    <div className="xl:col-span-2 bg-white rounded-[2rem] shadow-lg border border-gray-200 p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-700 rounded-xl shadow-lg shadow-blue-700/20">
                                    <FaChartLine className="text-yellow-400 text-xl" />
                                </div>
                                <div>
                                    <h3 className="font-black text-blue-700 uppercase text-sm tracking-widest">
                                        Performance Analytics
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                        Equipment vs Maintenance Requests Overview
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-1 bg-white p-1 rounded-xl border border-gray-200">
                                {["yearly", "monthly"].map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => handleSetTimeRange(range)}
                                        className={`px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${timeRange === range
                                            ? "bg-blue-700 text-yellow-400 shadow-md"
                                            : "text-blue-700/50 hover:text-blue-700 hover:bg-blue-50"
                                            }`}
                                    >
                                        {range}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <ProfessionalLineGraph lineGraphData={lineGraphs} isDark={isDark} />
                    </div>
                )}

                {activeChart === "bar" && (
                    <div className="xl:col-span-2 bg-white rounded-[2rem] shadow-lg border border-gray-200 p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-700 rounded-xl shadow-lg shadow-blue-700/20">
                                    <FaChartBar className="text-yellow-400 text-xl" />
                                </div>
                                <div>
                                    <h3 className="font-black text-blue-700 uppercase text-sm tracking-widest">
                                        {barChartType === "equipment" ? "Equipment Distribution" :
                                            barChartType === "maintenance" ? "Maintenance Distribution" :
                                                barChartType === "requests" ? "Requests Distribution" :
                                                    "Feedback Distribution"}
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                        {barChartType === "equipment" ? "Equipment by Laboratory" :
                                            barChartType === "maintenance" ? "Maintenance Requests by Laboratory" :
                                                barChartType === "requests" ? "Service Requests by Laboratory" :
                                                    "Feedback by Type"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black uppercase tracking-widest text-blue-700/40">
                                    Active View
                                </span>
                                <span className="px-3 py-1 bg-yellow-100 rounded-full text-[8px] font-black text-blue-700 border border-yellow-200">
                                    BAR CHART
                                </span>
                            </div>
                        </div>
                        <ProfessionalBarChart
                            barChartData={barCharts}
                            isDark={isDark}
                            chartType={barChartType}
                        />
                    </div>
                )}
            </div>

            {/* PIE CHARTS */}
            <div className="bg-white rounded-[2rem] shadow-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                    <div className="p-2.5 bg-blue-700 rounded-xl shadow-lg shadow-blue-700/20">
                        <FaChartLine className="text-yellow-400 text-xl" />
                    </div>
                    <h3 className="font-black text-blue-700 uppercase text-sm tracking-widest">
                        Distribution Analytics
                    </h3>
                    <span className="ml-auto text-[8px] font-black uppercase tracking-widest text-blue-700/30 px-3 py-1 rounded-full bg-blue-50 border border-blue-100">
                        {Object.keys(pieCharts || {}).filter(key => (pieCharts?.[key] || []).length > 0).length} Active
                    </span>
                </div>
                <DashboardPieCharts pieChartData={pieCharts} isDark={isDark} />
            </div>
        </div>
    );
});

// ============================================================
// LABORATORY VIEW
// ============================================================
const LaboratoryView = React.memo(({ laboratory }) => (
    <div className="space-y-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-blue-700/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-yellow-400" />
            <Laboratory laboratoryId={laboratory._id} />
        </div>
    </div>
));

export default Dashboard;