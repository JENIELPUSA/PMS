// src/components/Sidebar.jsx
import React, {
    forwardRef,
    useContext,
    useMemo,
    useState,
    useEffect,
} from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LogOut, ChevronDown, FileText } from "lucide-react";

import { navbarLinks } from "@/constants";
import { cn } from "@/utils/cn";
import PropTypes from "prop-types";

import bipsulogo from "../assets/bipsulogo.png";
import { AuthContext } from "../contexts/AuthContext";

// ============================================================
// PMS SUBMENU ITEMS — PMS 001 to PMS 007
// ============================================================
const PMS_SUBMENU = [
    { label: "PMS 001", path: "/dashboard/pms001" },
    { label: "PMS 002", path: "/dashboard/pms002" },
    { label: "PMS 003", path: "/dashboard/pms003" },
    { label: "PMS 004", path: "/dashboard/pms004" },
    { label: "PMS 005", path: "/dashboard/pms005" },
    { label: "PMS 006", path: "/dashboard/pms006" },
    { label: "PMS 007", path: "/dashboard/pms007" },
];

export const Sidebar = forwardRef(({ collapsed }, ref) => {
    const { role, logout } = useContext(AuthContext);
    const location = useLocation();

    // ========================================================
    // PERSIST EXPAND STATE SA LOCALSTORAGE
    // ========================================================
    const [pmsExpanded, setPmsExpanded] = useState(() => {
        try {
            const saved = localStorage.getItem("sidebar_pms_expanded");
            return saved === "true";
        } catch {
            return false;
        }
    });

    // ========================================================
    // ROLE PERMISSIONS
    // ========================================================
    const rolePermissions = useMemo(
        () => ({
            Technician: [
                "/dashboard",
                "/dashboard/maintenance", 
                "/dashboard/assign"
            ],

            User: [
                "/dashboard",
                "/dashboard/RequestMaintenances",
                "/dashboard/pms001",
                "/dashboard/pms002",
                "/dashboard/pms003",
                "/dashboard/pms004",
                "/dashboard/pms005",
                "/dashboard/pms006",
                "/dashboard/pms007",
            ],
        }),
        []
    );

    // ========================================================
    // FILTER NAV LINKS BY ROLE
    // ========================================================
    const filteredNavLinks = useMemo(() => {
        if (!role) return [];

        const allowedPaths = rolePermissions[role] || [];

        return navbarLinks
            .map((group) => ({
                ...group,
                links: group.links.filter((link) =>
                    allowedPaths.includes(link.path)
                ),
            }))
            .filter((group) => group.links.length > 0);
    }, [role, rolePermissions]);

    // ========================================================
    // CHECK KUNG MAY PMS ACCESS ANG ROLE
    // ========================================================
    const hasPmsAccess = useMemo(() => {
        if (!role) return false;
        const allowedPaths = rolePermissions[role] || [];
        return PMS_SUBMENU.some((pms) => allowedPaths.includes(pms.path));
    }, [role, rolePermissions]);

    // ========================================================
    // FILTER PMS SUBMENU BY ROLE
    // ========================================================
    const filteredPmsSubmenu = useMemo(() => {
        if (!role) return [];
        const allowedPaths = rolePermissions[role] || [];
        return PMS_SUBMENU.filter((pms) => allowedPaths.includes(pms.path));
    }, [role, rolePermissions]);

    // ========================================================
    // ✅ AUTO-EXPAND — ISANG BESES LANG SA MOUNT
    // ========================================================
    useEffect(() => {
        const currentPath = location.pathname;
        const isPmsRoute = PMS_SUBMENU.some(
            (pms) => currentPath === pms.path
        );

        if (isPmsRoute) {
            setPmsExpanded(true);
            try {
                localStorage.setItem("sidebar_pms_expanded", "true");
            } catch {
                // ignore
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ========================================================
    // ✅ TOGGLE HANDLER — manual expand/collapse
    // ========================================================
    const handleTogglePms = () => {
        setPmsExpanded((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(
                    "sidebar_pms_expanded",
                    String(next)
                );
            } catch {
                // ignore
            }
            return next;
        });
    };

    // ========================================================
    // STRICT CHECK — Dashboard active state
    // ========================================================
    const isDashboardActive = useMemo(() => {
        return location.pathname === "/dashboard";
    }, [location.pathname]);

    // ========================================================
    // CHECK KUNG MAY ACTIVE PMS SUB-ITEM
    // ========================================================
    const hasActivePmsChild = useMemo(() => {
        return PMS_SUBMENU.some(
            (pms) => location.pathname === pms.path
        );
    }, [location.pathname]);

    // ========================================================
    // LOADING STATE
    // ========================================================
    if (!role) {
        return (
            <aside
                ref={ref}
                className={cn(
                    "fixed z-[100] flex h-full w-[240px] flex-col overflow-x-hidden border-r border-blue-200 bg-white",
                    collapsed ? "md:w-[70px] md:items-center" : "md:w-[240px]",
                    collapsed ? "max-md:-left-full" : "max-md:left-0"
                )}
            >
                <div className="flex items-center justify-center h-full text-blue-400 text-sm">
                    Loading...
                </div>
            </aside>
        );
    }

    // ========================================================
    // RENDER
    // ========================================================
    return (
        <aside
            ref={ref}
            className={cn(
                "fixed z-[100] flex h-full w-[240px] flex-col overflow-x-hidden border-r border-blue-200 bg-white [transition:_width_300ms_cubic-bezier(0.4,_0,_0.2,_1),_left_300ms_cubic-bezier(0.4,_0,_0.2,_1)]",
                collapsed ? "md:w-[70px] md:items-center" : "md:w-[240px]",
                collapsed ? "max-md:-left-full" : "max-md:left-0"
            )}
        >
            {/* ============================================ */}
            {/* LOGO SECTION */}
            {/* ============================================ */}
            <div
                className={cn(
                    "flex items-center justify-center border-b border-blue-100 bg-blue-600",
                    collapsed ? "md:px-2 md:py-4" : "px-4 py-4"
                )}
            >
                <img
                    src={bipsulogo}
                    alt="Bipsu Logo"
                    className={cn(
                        "rounded-full object-cover border-2 border-yellow-400 shadow-md",
                        collapsed ? "w-10 h-10" : "w-16 h-16"
                    )}
                />
            </div>

            {/* ============================================ */}
            {/* NAVIGATION LINKS */}
            {/* ============================================ */}
            <div className="flex w-full flex-col gap-y-4 overflow-y-auto overflow-x-hidden p-2 [scrollbar-width:_thin] scrollbar-thumb-blue-300 scrollbar-track-white">
                {filteredNavLinks.length === 0 ? (
                    <div className="text-center text-blue-300 text-sm py-4">
                        No menu items available
                    </div>
                ) : (
                    filteredNavLinks.map((group) => (
                        <div key={group.title} className="mb-4 w-full">
                            {!collapsed && (
                                <p className="mb-2 px-4 text-[10px] font-bold uppercase tracking-[2px] text-blue-400">
                                    {group.title}
                                </p>
                            )}

                            <div className="flex flex-col gap-1.5 px-1">
                                {group.links.map((link) => {
                                    const isDashboardLink =
                                        link.path === "/dashboard";

                                    return (
                                        <NavLink
                                            key={link.label}
                                            to={link.path}
                                            className={({ isActive }) => {
                                                const shouldBeActive =
                                                    isDashboardLink
                                                        ? isDashboardActive
                                                        : isActive;

                                                return cn(
                                                    "group flex transition-all duration-300 relative overflow-hidden",
                                                    collapsed
                                                        ? "flex-col items-center justify-center rounded-xl py-2 px-1 text-center w-full"
                                                        : "flex-row items-center gap-4 rounded-xl px-4 py-3",
                                                    shouldBeActive
                                                        ? "bg-yellow-400 text-blue-900 shadow-sm font-semibold"
                                                        : "text-blue-700 hover:bg-blue-50 hover:text-blue-900"
                                                );
                                            }}
                                        >
                                            {({ isActive }) => {
                                                const shouldBeActive =
                                                    isDashboardLink
                                                        ? isDashboardActive
                                                        : isActive;

                                                return (
                                                    <>
                                                        {shouldBeActive && (
                                                            <span
                                                                className={cn(
                                                                    "absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full left-0"
                                                                )}
                                                            />
                                                        )}

                                                        <link.icon
                                                            size={
                                                                collapsed
                                                                    ? 20
                                                                    : 22
                                                            }
                                                            className="shrink-0 transition-transform duration-300 group-hover:scale-110"
                                                        />

                                                        <span
                                                            className={cn(
                                                                "font-medium transition-all duration-300",
                                                                collapsed
                                                                    ? "mt-1 text-[8px] uppercase tracking-tighter leading-none w-full truncate px-0.5"
                                                                    : "text-[14px]"
                                                            )}
                                                        >
                                                            {link.label}
                                                        </span>

                                                        {collapsed && (
                                                            <span className="absolute left-full ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-md">
                                                                {link.label}
                                                            </span>
                                                        )}
                                                    </>
                                                );
                                            }}
                                        </NavLink>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}

                {/* ============================================ */}
                {/* PMS FORM — EXPANDABLE SUBMENU               */}
                {/* ============================================ */}
                {hasPmsAccess && filteredPmsSubmenu.length > 0 && (
                    <div className="w-full">
                        {!collapsed && (
                            <p className="mb-2 px-4 text-[10px] font-bold uppercase tracking-[2px] text-blue-400">
                                Maintenance
                            </p>
                        )}

                        <div className="flex flex-col gap-1.5 px-1">
                            {/* PARENT BUTTON — PMS Form */}
                            <button
                                type="button"
                                onClick={handleTogglePms}
                                className={cn(
                                    "group flex w-full transition-all duration-300 relative overflow-hidden",
                                    collapsed
                                        ? "flex-col items-center justify-center rounded-xl py-2 px-1 text-center"
                                        : "flex-row items-center gap-4 rounded-xl px-4 py-3",
                                    hasActivePmsChild
                                        ? "bg-yellow-400 text-blue-900 shadow-sm font-semibold"
                                        : "text-blue-700 hover:bg-blue-50 hover:text-blue-900"
                                )}
                            >
                                {hasActivePmsChild && (
                                    <span
                                        className={cn(
                                            "absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full left-0"
                                        )}
                                    />
                                )}

                                <FileText
                                    size={collapsed ? 20 : 22}
                                    className="shrink-0 transition-transform duration-300 group-hover:scale-110"
                                />

                                <span
                                    className={cn(
                                        "font-medium transition-all duration-300 flex-1 text-left",
                                        collapsed
                                            ? "mt-1 text-[8px] uppercase tracking-tighter leading-none w-full truncate px-0.5 text-center"
                                            : "text-[14px]"
                                    )}
                                >
                                    PMS Form
                                </span>

                                {/* CHEVRON — rotate kapag naka-expand */}
                                {!collapsed && (
                                    <ChevronDown
                                        size={18}
                                        className={cn(
                                            "shrink-0 transition-transform duration-300",
                                            pmsExpanded && "rotate-180"
                                        )}
                                    />
                                )}

                                {collapsed && (
                                    <span className="absolute left-full ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-md">
                                        PMS Form
                                    </span>
                                )}
                            </button>

                            {/* SUBMENU — PMS 001 to PMS 007 */}
                            {pmsExpanded && (
                                <div
                                    className={cn(
                                        "flex flex-col gap-1 mt-1 transition-all duration-300",
                                        collapsed
                                            ? "items-center"
                                            : "ml-4 pl-4 border-l-2 border-blue-100"
                                    )}
                                >
                                    {filteredPmsSubmenu.map((pms) => {
                                        const isPmsActive =
                                            location.pathname === pms.path;

                                        return (
                                            <NavLink
                                                key={pms.path}
                                                to={pms.path}
                                                className={cn(
                                                    "group flex transition-all duration-300 relative overflow-hidden",
                                                    collapsed
                                                        ? "flex-col items-center justify-center rounded-lg py-1.5 px-1 text-center w-full"
                                                        : "flex-row items-center gap-3 rounded-lg px-3 py-2",
                                                    isPmsActive
                                                        ? "bg-yellow-400 text-blue-900 shadow-sm font-semibold"
                                                        : "text-blue-600 hover:bg-blue-50 hover:text-blue-900"
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "shrink-0 rounded-full transition-all duration-300",
                                                        collapsed
                                                            ? "w-1.5 h-1.5"
                                                            : "w-2 h-2",
                                                        isPmsActive
                                                            ? "bg-blue-900"
                                                            : "bg-blue-300 group-hover:bg-blue-600"
                                                    )}
                                                />

                                                <span
                                                    className={cn(
                                                        "font-medium transition-all duration-300",
                                                        collapsed
                                                            ? "mt-0.5 text-[8px] uppercase tracking-tighter leading-none truncate w-full px-0.5"
                                                            : "text-[13px]"
                                                    )}
                                                >
                                                    {pms.label}
                                                </span>

                                                {collapsed && (
                                                    <span className="absolute left-full ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-md">
                                                        {pms.label}
                                                    </span>
                                                )}
                                            </NavLink>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ============================================ */}
            {/* FOOTER / USER INFO */}
            {/* ============================================ */}
            <div className="mt-auto border-t border-blue-100 bg-blue-50">
                {collapsed && (
                    <div className="flex justify-center py-2">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                {role?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-white"></div>
                        </div>
                    </div>
                )}

                <div className="p-2">
                    <button
                        onClick={logout}
                        className={cn(
                            "group flex w-full transition-all duration-300 relative overflow-hidden",
                            collapsed
                                ? "flex-col items-center justify-center py-2 text-red-500"
                                : "flex-row items-center gap-4 px-4 py-3 text-blue-600 hover:text-red-500",
                            "hover:bg-red-50 rounded-xl"
                        )}
                    >
                        <LogOut size={20} className="shrink-0" />
                        <span
                            className={cn(
                                "font-bold transition-all duration-300",
                                collapsed
                                    ? "mt-1 text-[8px] uppercase tracking-tighter truncate w-full px-0.5"
                                    : "text-sm"
                            )}
                        >
                            Logout
                        </span>
                    </button>
                </div>
            </div>
        </aside>
    );
});

Sidebar.displayName = "Sidebar";

Sidebar.propTypes = {
    collapsed: PropTypes.bool,
};