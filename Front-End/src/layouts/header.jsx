// Header.jsx - Full fixed version with proper z-index (Notification removed)
import { useState, useContext } from "react";
import { useTheme } from "@/hooks/use-theme";
import {
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react";
import PropTypes from "prop-types";
import { UserDataContext } from "../contexts/UserContext/UserContext";
import { MessageDetailModal } from "./MessageDetailModal";
import { AuthContext } from "../contexts/AuthContext";

export const Header = ({ collapsed, setCollapsed }) => {
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [isLoadingTechnicians, setIsLoadingTechnicians] = useState(false);
    const [localTechnicians, setLocalTechnicians] = useState([]);

    const { technicians = [] } = useContext(UserDataContext) || {};

    const techniciansToUse = localTechnicians.length > 0 ? localTechnicians : technicians;

    return (
        <>
            {/* Header with z-[60] to ensure it's above DashboardBanner */}
            <header className="relative z-[60] flex h-[60px] items-center justify-between bg-white px-4 shadow-md transition-colors">
                <div className="flex items-center gap-x-3">
                    <button
                        className="btn-ghost size-10 text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-300 hover:scale-105"
                        onClick={() => setCollapsed(!collapsed)}
                        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {collapsed ? (
                            <PanelLeftOpen size={20} className="text-blue-600" />
                        ) : (
                            <PanelLeftClose size={20} className="text-blue-600" />
                        )}
                    </button>
                </div>
            </header>

            {/* Message Detail Modal - with high z-index to appear above everything */}
            <MessageDetailModal
                selectedMessage={selectedMessage}
                onClose={() => setSelectedMessage(null)}
                technicians={techniciansToUse}
                isLoadingTechnicians={isLoadingTechnicians}
                onAssignSuccess={() => {
                    console.log("Technician assigned successfully");
                }}
                onAssignError={(error) => {
                    console.error("Assignment error:", error);
                }}
                onApprove={(requestId) => {
                    console.log("Request approved:", requestId);
                }}
            />
        </>
    );
};

Header.propTypes = {
    collapsed: PropTypes.bool,
    setCollapsed: PropTypes.func,
};